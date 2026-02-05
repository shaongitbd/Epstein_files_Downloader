package main

import (
	"bufio"
	"flag"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

var (
	baseURL     = "https://www.justice.gov/epstein/"
	dataset     string
	startNum    int
	endNum      int
	outputDir   string
	concurrency int
	verbose     bool

	// Cookies
	akBmsc      string
	ageVerified string
	queueIT     string

	// Stats
	downloaded int64
	failed     int64
	skipped    int64
	totalBytes int64

	// Shared transport for connection pooling
	transport *http.Transport
)

func loadEnvFile() {
	paths := []string{".env", "../.env", "../../.env"}

	for _, path := range paths {
		file, err := os.Open(path)
		if err != nil {
			continue
		}
		defer file.Close()

		scanner := bufio.NewScanner(file)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			parts := strings.SplitN(line, "=", 2)
			if len(parts) == 2 {
				key := strings.TrimSpace(parts[0])
				value := strings.TrimSpace(parts[1])
				if os.Getenv(key) == "" {
					os.Setenv(key, value)
				}
			}
		}
		fmt.Printf("Loaded .env from %s\n", path)
		return
	}
}

func main() {
	loadEnvFile()

	flag.StringVar(&dataset, "d", "files/DataSet%201/", "Dataset path")
	flag.IntVar(&startNum, "s", 1, "Start file number")
	flag.IntVar(&endNum, "e", 2731783, "End file number")
	flag.StringVar(&outputDir, "o", "downloads", "Output directory")
	flag.IntVar(&concurrency, "c", 100, "Concurrent downloads")
	flag.BoolVar(&verbose, "v", false, "Verbose output (show each file)")
	flag.StringVar(&akBmsc, "ak", "", "ak_bmsc cookie value")
	flag.StringVar(&ageVerified, "age", "true", "justiceGovAgeVerified cookie")
	flag.StringVar(&queueIT, "queue", "", "QueueITAccepted cookie value")
	flag.Parse()

	if akBmsc == "" {
		akBmsc = os.Getenv("DOJ_COOKIE_AK_BMSC")
	}
	if queueIT == "" {
		queueIT = os.Getenv("DOJ_COOKIE_QUEUE_IT")
	}

	if akBmsc == "" || queueIT == "" {
		fmt.Println("Error: Cookies required. Set via flags or environment variables:")
		fmt.Println("  DOJ_COOKIE_AK_BMSC")
		fmt.Println("  DOJ_COOKIE_QUEUE_IT")
		os.Exit(1)
	}

	if err := os.MkdirAll(outputDir, 0755); err != nil {
		fmt.Printf("Error creating output dir: %v\n", err)
		os.Exit(1)
	}

	// Create optimized transport for connection reuse
	transport = &http.Transport{
		MaxIdleConns:        concurrency * 2,
		MaxIdleConnsPerHost: concurrency * 2,
		MaxConnsPerHost:     concurrency * 2,
		IdleConnTimeout:     90 * time.Second,
		DisableCompression:  true,
		DialContext: (&net.Dialer{
			Timeout:   10 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
	}

	existing := getExistingFiles()
	fmt.Printf("Found %d existing files\n", len(existing))

	var work []int
	for i := startNum; i <= endNum; i++ {
		if _, exists := existing[i]; !exists {
			work = append(work, i)
		}
	}

	if len(work) == 0 {
		fmt.Println("All files already downloaded!")
		return
	}

	fmt.Println("========================================")
	fmt.Println("DOJ Epstein Files Downloader (Go)")
	fmt.Println("========================================")
	fmt.Printf("Dataset: %s\n", dataset)
	fmt.Printf("Range: EFTA%08d to EFTA%08d\n", startNum, endNum)
	fmt.Printf("Files to download: %d\n", len(work))
	fmt.Printf("Concurrency: %d\n", concurrency)
	fmt.Printf("Output: %s\n", outputDir)
	fmt.Printf("Verbose: %v\n", verbose)
	fmt.Println("========================================")

	startTime := time.Now()

	jobs := make(chan int, concurrency*2)
	var wg sync.WaitGroup

	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go worker(jobs, &wg)
	}

	done := make(chan bool)
	if !verbose {
		go progressReporter(len(work), startTime, done)
	}

	for _, num := range work {
		jobs <- num
	}
	close(jobs)

	wg.Wait()
	if !verbose {
		done <- true
	}

	elapsed := time.Since(startTime)
	fmt.Println("\n========================================")
	fmt.Println("DOWNLOAD COMPLETE")
	fmt.Println("========================================")
	fmt.Printf("Time: %v\n", elapsed.Round(time.Second))
	fmt.Printf("Downloaded: %d\n", downloaded)
	fmt.Printf("Failed: %d\n", failed)
	fmt.Printf("Skipped (404): %d\n", skipped)
	fmt.Printf("Total size: %.2f GB\n", float64(totalBytes)/1024/1024/1024)
	if elapsed.Seconds() > 0 {
		fmt.Printf("Speed: %.1f files/sec (%.1f total/sec)\n",
			float64(downloaded)/elapsed.Seconds(),
			float64(downloaded+skipped+failed)/elapsed.Seconds())
	}
}

func worker(jobs <-chan int, wg *sync.WaitGroup) {
	defer wg.Done()

	client := &http.Client{
		Transport: transport,
		Timeout:   30 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	for num := range jobs {
		downloadFile(client, num)
	}
}

func downloadFile(client *http.Client, num int) {
	filename := fmt.Sprintf("EFTA%08d.pdf", num)
	url := baseURL + dataset + filename
	fpath := filepath.Join(outputDir, filename)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		atomic.AddInt64(&failed, 1)
		if verbose {
			fmt.Printf("[FAIL] %s - request error: %v\n", filename, err)
		}
		return
	}

	req.Header.Set("Cookie", fmt.Sprintf("ak_bmsc=%s; justiceGovAgeVerified=%s; QueueITAccepted-SDFrts345E-V3_usdojfiles=%s",
		akBmsc, ageVerified, queueIT))
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	req.Header.Set("Connection", "keep-alive")

	maxRetries := 3
	for attempt := 0; attempt < maxRetries; attempt++ {
		resp, err := client.Do(req)
		if err != nil {
			if verbose {
				fmt.Printf("[RETRY] %s - attempt %d: %v\n", filename, attempt+1, err)
			}
			time.Sleep(time.Duration(attempt+1) * 500 * time.Millisecond)
			continue
		}

		switch resp.StatusCode {
		case 200:
			file, err := os.Create(fpath)
			if err != nil {
				resp.Body.Close()
				atomic.AddInt64(&failed, 1)
				if verbose {
					fmt.Printf("[FAIL] %s - create error: %v\n", filename, err)
				}
				return
			}

			n, err := io.Copy(file, resp.Body)
			file.Close()
			resp.Body.Close()

			if err != nil {
				os.Remove(fpath)
				atomic.AddInt64(&failed, 1)
				if verbose {
					fmt.Printf("[FAIL] %s - write error: %v\n", filename, err)
				}
				return
			}

			atomic.AddInt64(&downloaded, 1)
			atomic.AddInt64(&totalBytes, n)
			if verbose {
				fmt.Printf("[OK] %s - %d bytes\n", filename, n)
			}
			return

		case 404:
			resp.Body.Close()
			atomic.AddInt64(&skipped, 1)
			if verbose {
				fmt.Printf("[404] %s - not found\n", filename)
			}
			return

		case 429:
			resp.Body.Close()
			if verbose {
				fmt.Printf("[429] %s - rate limited, waiting...\n", filename)
			}
			time.Sleep(3 * time.Second)
			continue

		case 302:
			resp.Body.Close()
			fmt.Printf("\n[WARN] %s - 302 redirect, cookies may be expired!\n", filename)
			atomic.AddInt64(&failed, 1)
			return

		default:
			resp.Body.Close()
			if verbose {
				fmt.Printf("[%d] %s - unexpected status, retrying...\n", resp.StatusCode, filename)
			}
			time.Sleep(time.Duration(attempt+1) * 500 * time.Millisecond)
			continue
		}
	}

	atomic.AddInt64(&failed, 1)
	if verbose {
		fmt.Printf("[FAIL] %s - max retries exceeded\n", filename)
	}
}

func getExistingFiles() map[int]bool {
	existing := make(map[int]bool)
	files, err := os.ReadDir(outputDir)
	if err != nil {
		return existing
	}

	for _, f := range files {
		if f.IsDir() {
			continue
		}
		var num int
		if _, err := fmt.Sscanf(f.Name(), "EFTA%08d.pdf", &num); err == nil {
			info, err := f.Info()
			if err == nil && info.Size() > 0 {
				existing[num] = true
			}
		}
	}
	return existing
}

func progressReporter(total int, startTime time.Time, done chan bool) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-done:
			return
		case <-ticker.C:
			d := atomic.LoadInt64(&downloaded)
			f := atomic.LoadInt64(&failed)
			s := atomic.LoadInt64(&skipped)
			completed := d + f + s
			elapsed := time.Since(startTime).Seconds()

			totalSpeed := float64(completed) / elapsed
			downloadSpeed := float64(d) / elapsed

			remaining := float64(0)
			if totalSpeed > 0 {
				remaining = float64(total-int(completed)) / totalSpeed
			}

			fmt.Printf("\rProgress: %d/%d | OK: %d | 404: %d | Fail: %d | %.0f/sec (%.0f dl/sec) | ETA: %.0fs     ",
				completed, total, d, s, f, totalSpeed, downloadSpeed, remaining)
		}
	}
}
