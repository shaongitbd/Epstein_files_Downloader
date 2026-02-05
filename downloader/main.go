package main

import (
	"bufio"
	"flag"
	"fmt"
	"io"
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

	// Cookies
	akBmsc      string
	ageVerified string
	queueIT     string

	// Stats
	downloaded  int64
	failed      int64
	skipped     int64
	totalBytes  int64
)

func loadEnvFile() {
	// Try multiple locations for .env file
	paths := []string{
		".env",
		"../.env",
		"../../.env",
	}

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
				// Only set if not already set
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
	// Load .env file first
	loadEnvFile()

	flag.StringVar(&dataset, "d", "files/DataSet%201/", "Dataset path")
	flag.IntVar(&startNum, "s", 1, "Start file number")
	flag.IntVar(&endNum, "e", 2731783, "End file number")
	flag.StringVar(&outputDir, "o", "downloads", "Output directory")
	flag.IntVar(&concurrency, "c", 50, "Concurrent downloads")
	flag.StringVar(&akBmsc, "ak", "", "ak_bmsc cookie value")
	flag.StringVar(&ageVerified, "age", "true", "justiceGovAgeVerified cookie")
	flag.StringVar(&queueIT, "queue", "", "QueueITAccepted cookie value")
	flag.Parse()

	// Load from env if not provided via flags
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

	// Create output directory
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		fmt.Printf("Error creating output dir: %v\n", err)
		os.Exit(1)
	}

	// Get already downloaded files
	existing := getExistingFiles()
	fmt.Printf("Found %d existing files\n", len(existing))

	// Build work queue
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
	fmt.Println("========================================")

	startTime := time.Now()

	// Create work channel
	jobs := make(chan int, concurrency*2)
	var wg sync.WaitGroup

	// Start workers
	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go worker(jobs, &wg)
	}

	// Progress reporter
	done := make(chan bool)
	go progressReporter(len(work), startTime, done)

	// Send work
	for _, num := range work {
		jobs <- num
	}
	close(jobs)

	// Wait for completion
	wg.Wait()
	done <- true

	// Final stats
	elapsed := time.Since(startTime)
	fmt.Println("\n========================================")
	fmt.Println("DOWNLOAD COMPLETE")
	fmt.Println("========================================")
	fmt.Printf("Time: %v\n", elapsed.Round(time.Second))
	fmt.Printf("Downloaded: %d\n", downloaded)
	fmt.Printf("Failed: %d\n", failed)
	fmt.Printf("Skipped (404): %d\n", skipped)
	fmt.Printf("Total size: %.2f GB\n", float64(totalBytes)/1024/1024/1024)
	fmt.Printf("Speed: %.1f files/sec\n", float64(downloaded)/elapsed.Seconds())
}

func worker(jobs <-chan int, wg *sync.WaitGroup) {
	defer wg.Done()

	client := &http.Client{
		Timeout: 60 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse // Don't follow redirects
		},
	}

	for num := range jobs {
		downloadFile(client, num)
	}
}

func downloadFile(client *http.Client, num int) {
	filename := fmt.Sprintf("EFTA%08d.pdf", num)
	url := baseURL + dataset + filename
	filepath := filepath.Join(outputDir, filename)

	// Create request
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		atomic.AddInt64(&failed, 1)
		return
	}

	// Set cookies
	req.Header.Set("Cookie", fmt.Sprintf("ak_bmsc=%s; justiceGovAgeVerified=%s; QueueITAccepted-SDFrts345E-V3_usdojfiles=%s",
		akBmsc, ageVerified, queueIT))
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	// Retry loop
	maxRetries := 3
	for attempt := 0; attempt < maxRetries; attempt++ {
		resp, err := client.Do(req)
		if err != nil {
			time.Sleep(time.Duration(attempt+1) * time.Second)
			continue
		}

		switch resp.StatusCode {
		case 200:
			// Success - save file
			file, err := os.Create(filepath)
			if err != nil {
				resp.Body.Close()
				atomic.AddInt64(&failed, 1)
				return
			}

			n, err := io.Copy(file, resp.Body)
			file.Close()
			resp.Body.Close()

			if err != nil {
				os.Remove(filepath)
				atomic.AddInt64(&failed, 1)
				return
			}

			atomic.AddInt64(&downloaded, 1)
			atomic.AddInt64(&totalBytes, n)
			return

		case 404:
			resp.Body.Close()
			atomic.AddInt64(&skipped, 1)
			return

		case 429:
			// Rate limited
			resp.Body.Close()
			time.Sleep(5 * time.Second)
			continue

		case 302:
			// Cookie expired
			resp.Body.Close()
			fmt.Printf("\nWarning: 302 redirect on %d - cookies may be expired\n", num)
			atomic.AddInt64(&failed, 1)
			return

		default:
			resp.Body.Close()
			time.Sleep(time.Duration(attempt+1) * time.Second)
			continue
		}
	}

	atomic.AddInt64(&failed, 1)
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
	ticker := time.NewTicker(2 * time.Second)
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
			speed := float64(d) / elapsed
			remaining := float64(total-int(completed)) / speed

			fmt.Printf("\rProgress: %d/%d | OK: %d | 404: %d | Failed: %d | %.1f files/sec | ETA: %.0fs     ",
				completed, total, d, s, f, speed, remaining)
		}
	}
}
