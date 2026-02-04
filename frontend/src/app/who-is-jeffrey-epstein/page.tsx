import { Metadata } from 'next';
import Link from 'next/link';
import { Shield, ArrowLeft, AlertTriangle, Calendar, MapPin, FileText, Scale, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Who Was Jeffrey Epstein? | Jeffrey Epstein - Photo Gallery',
  description: 'Learn about Jeffrey Epstein, the convicted sex offender and financier whose crimes against minors led to one of the most significant criminal investigations in modern history.',
  openGraph: {
    title: 'Who Was Jeffrey Epstein? | Jeffrey Epstein - Photo Gallery',
    description: 'Learn about Jeffrey Epstein, the convicted sex offender and financier whose crimes against minors led to one of the most significant criminal investigations in modern history.',
    type: 'article',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Who Was Jeffrey Epstein?',
    description: 'Learn about Jeffrey Epstein, the convicted sex offender and financier whose crimes against minors led to one of the most significant criminal investigations in modern history.',
  },
};

export default function WhoIsJeffreyEpsteinPage() {
  return (
    <div className="min-h-screen bg-[#050506] text-zinc-100">
      {/* Atmospheric overlays */}
      <div className="noise-overlay" />
      <div className="scanlines" />
      <div className="vignette" />

      {/* Header */}
      <header className="relative border-b border-zinc-800/50 overflow-hidden">
        <div className="absolute inset-0 security-stripe opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/80 via-zinc-950/90 to-zinc-950" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-amber-500 transition-colors mb-6 group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-mono text-xs tracking-wider">BACK TO ARCHIVE</span>
          </Link>

          {/* Classification badge */}
          <div className="inline-flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-red-500/10 border-2 border-red-500/30">
              <Shield size={12} className="text-red-500 sm:w-3.5 sm:h-3.5" />
              <span className="font-mono text-[9px] sm:text-[10px] font-bold tracking-[0.2em] sm:tracking-[0.25em] text-red-500">
                DECLASSIFIED
              </span>
            </div>
            <div className="h-3 sm:h-4 w-px bg-zinc-700" />
            <span className="font-mono text-[9px] sm:text-[10px] text-zinc-600 tracking-wider">
              BACKGROUND INFORMATION
            </span>
          </div>

          {/* Title */}
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-semibold tracking-wide text-shadow-glow">
            <span className="text-gradient">WHO WAS JEFFREY EPSTEIN?</span>
          </h1>

          <p className="font-mono text-[10px] sm:text-xs text-zinc-500 tracking-[0.2em] sm:tracking-[0.3em] mt-2 sm:mt-3">
            A COMPREHENSIVE OVERVIEW
          </p>

          <div className="flex items-center gap-3 mt-3 sm:mt-4">
            <div className="w-12 sm:w-16 h-px bg-gradient-to-r from-amber-500 to-transparent" />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Warning banner */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-8 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-200 font-medium text-sm">Content Warning</p>
            <p className="text-zinc-400 text-sm mt-1">
              This page contains information about child sexual abuse and sex trafficking. Reader discretion is advised.
            </p>
          </div>
        </div>

        <article className="prose prose-invert prose-zinc max-w-none">
          {/* Quick Facts */}
          <div className="not-prose grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <Calendar size={16} />
                <span className="font-mono text-xs">LIFETIME</span>
              </div>
              <p className="text-zinc-200">January 20, 1953 – August 10, 2019</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <MapPin size={16} />
                <span className="font-mono text-xs">ORIGIN</span>
              </div>
              <p className="text-zinc-200">Brooklyn, New York, USA</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <Scale size={16} />
                <span className="font-mono text-xs">CONVICTED OF</span>
              </div>
              <p className="text-zinc-200">Sex trafficking, procuring a minor for prostitution</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <Users size={16} />
                <span className="font-mono text-xs">KNOWN VICTIMS</span>
              </div>
              <p className="text-zinc-200">Over 1,000 confirmed</p>
            </div>
          </div>

          <h2 className="text-amber-500 font-serif">Overview</h2>
          <p>
            Jeffrey Edward Epstein was an American financier, convicted child sex offender, serial rapist, and human trafficker. 
            He built a vast network of powerful connections while simultaneously operating a sophisticated sex trafficking 
            operation that targeted vulnerable young girls, some as young as 12 years old.
          </p>

          <h2 className="text-amber-500 font-serif">Early Life and Career</h2>
          <p>
            Born in Brooklyn, New York, Epstein dropped out of college but managed to secure a teaching position at the 
            prestigious Dalton School in Manhattan at age 20, despite lacking a degree. He was hired by headmaster 
            Donald Barr (father of future Attorney General William Barr) and taught physics and calculus from 1973 to 1976.
          </p>
          <p>
            After leaving Dalton, Epstein entered the finance industry, working at Bear Stearns before establishing his own 
            financial management firm, J. Epstein & Company, in 1982. He cultivated an air of mystery around his wealth, 
            with some estimates placing his net worth at over $500 million, though the true sources of his fortune 
            remain murky.
          </p>

          <h2 className="text-amber-500 font-serif">Criminal Activities</h2>
          <p>
            Epstein&apos;s criminal enterprise involved recruiting vulnerable young girls, often from troubled backgrounds, 
            under the guise of offering them money for &quot;massages.&quot; Once in his homes, victims were subjected to 
            sexual abuse. His operation was facilitated by associates, most notably Ghislaine Maxwell, who was convicted 
            in 2021 for her role in recruiting and grooming victims.
          </p>
          <p>
            The abuse took place across multiple properties, including:
          </p>
          <ul>
            <li>His Manhattan townhouse – a massive $56 million property on the Upper East Side</li>
            <li>A Palm Beach, Florida mansion</li>
            <li>Little St. James – his private island in the U.S. Virgin Islands, nicknamed &quot;Pedophile Island&quot;</li>
            <li>Zorro Ranch in New Mexico</li>
            <li>An apartment in Paris, France</li>
          </ul>
          <p>
            Evidence suggests Epstein may have used hidden cameras to record powerful visitors, potentially for 
            blackmail purposes. Witnesses reported seeing cameras throughout his properties, including in bedrooms 
            and bathrooms.
          </p>

          <h2 className="text-amber-500 font-serif">The 2008 Plea Deal</h2>
          <p>
            Despite evidence of abuse involving dozens of minors, Epstein received an extraordinarily lenient plea deal 
            in 2008. Negotiated by his high-powered legal team (which included Alan Dershowitz and Ken Starr) with 
            U.S. Attorney Alexander Acosta, Epstein pleaded guilty to just two state prostitution charges.
          </p>
          <p>
            He served only 13 months in a private wing of a Florida county jail, with generous work release that 
            allowed him to leave for up to 12 hours a day, six days a week. This &quot;sweetheart deal&quot; was later 
            ruled to have violated federal law by keeping victims uninformed.
          </p>
          <p>
            Acosta later stated he was told that Epstein &quot;belonged to intelligence&quot; and was &quot;above his pay grade,&quot; 
            suggesting possible connections to intelligence agencies.
          </p>

          <h2 className="text-amber-500 font-serif">2019 Arrest and Death</h2>
          <p>
            On July 6, 2019, Epstein was arrested on federal sex trafficking charges by the FBI-NYPD Crimes Against 
            Children Task Force. Federal agents raided his Manhattan home, discovering thousands of photographs 
            of nude and partially nude young women, along with CDs labeled with names of victims.
          </p>
          <p>
            On August 10, 2019, Epstein was found dead in his cell at the Metropolitan Correctional Center in 
            New York City. His death was ruled a suicide by hanging, though this conclusion has been disputed 
            by his lawyers and a forensic pathologist hired by his family.
          </p>
          <p>
            The circumstances surrounding his death—including guards who fell asleep and falsified records, 
            malfunctioning security cameras, and his removal from suicide watch just days earlier—have fueled 
            widespread skepticism and conspiracy theories.
          </p>

          <h2 className="text-amber-500 font-serif">The Declassified Files (2024-2026)</h2>
          <p>
            In late 2023, a federal judge ordered the unsealing of documents related to a lawsuit against 
            Ghislaine Maxwell, revealing names of over 170 individuals associated with Epstein. The releases 
            continued through 2024, 2025, and into 2026.
          </p>
          <p>
            Key revelations from the released files include:
          </p>
          <ul>
            <li>Epstein&apos;s extensive connections to politicians, royalty, celebrities, and business leaders</li>
            <li>Evidence of a vast surveillance operation in his properties</li>
            <li>Details about the recruiting and grooming methods used on victims</li>
            <li>Financial records showing billions of dollars in transactions</li>
            <li>Correspondence revealing the extent of his influence network</li>
          </ul>
          <p>
            In July 2025, the Department of Justice released a memo stating that despite the extensive investigation, 
            no definitive &quot;client list&quot; was found, and investigators concluded Epstein died by suicide. 
            However, the release of documents continues, with millions of pages now publicly available.
          </p>

          <h2 className="text-amber-500 font-serif">Ghislaine Maxwell</h2>
          <p>
            Ghislaine Maxwell, the daughter of British media mogul Robert Maxwell, was Epstein&apos;s longtime associate 
            and was described as his &quot;partner in crime.&quot; She was arrested in July 2020 and convicted in December 2021 
            on multiple charges including sex trafficking of a minor. She was sentenced to 20 years in federal prison.
          </p>
          <p>
            Maxwell played a crucial role in recruiting, grooming, and sometimes participating in the abuse of 
            victims. Many survivors have described her as equally culpable as Epstein in their abuse.
          </p>

          <h2 className="text-amber-500 font-serif">The Victims</h2>
          <p>
            Attorneys representing Epstein&apos;s victims estimate that over 1,000 women and girls were abused by Epstein 
            and his associates. Many were recruited from vulnerable circumstances—runaways, girls from troubled homes, 
            or young women seeking modeling careers.
          </p>
          <p>
            Brave survivors like Virginia Giuffre have publicly spoken about their experiences, helping to expose 
            the full scope of Epstein&apos;s crimes and holding powerful individuals accountable.
          </p>
          <p>
            If you or someone you know has been affected by sexual abuse, resources are available. The Epstein 
            Victims&apos; Compensation Program has distributed over $125 million to more than 150 victims.
          </p>

          <h2 className="text-amber-500 font-serif">Why This Matters</h2>
          <p>
            The Epstein case exposed deep failures in the American justice system—how wealth and connections can 
            shield predators from consequences, how institutions can fail to protect children, and how powerful 
            networks can operate in plain sight for decades.
          </p>
          <p>
            This archive exists to ensure transparency and public access to these declassified documents. 
            Understanding how these crimes occurred—and how they were enabled—is essential to preventing 
            similar abuses in the future.
          </p>
        </article>

        {/* Related links */}
        <div className="mt-12 pt-8 border-t border-zinc-800">
          <h3 className="font-mono text-xs text-zinc-400 tracking-wider mb-4">RELATED RESOURCES</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/parent-resources"
              className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 hover:border-amber-500/50 transition-colors group"
            >
              <div className="flex items-center gap-2 text-amber-500 mb-2">
                <Shield size={16} />
                <span className="font-mono text-xs">PARENT RESOURCES</span>
              </div>
              <p className="text-zinc-300 text-sm group-hover:text-white transition-colors">
                Learn how to protect your children from predators and recognize warning signs.
              </p>
            </Link>
            <Link
              href="/"
              className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 hover:border-amber-500/50 transition-colors group"
            >
              <div className="flex items-center gap-2 text-amber-500 mb-2">
                <FileText size={16} />
                <span className="font-mono text-xs">BROWSE ARCHIVE</span>
              </div>
              <p className="text-zinc-300 text-sm group-hover:text-white transition-colors">
                Explore the declassified documents and images from the Epstein files.
              </p>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-zinc-800/50 mt-12">
        <div className="absolute inset-0 security-stripe opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-red-500" />
              <span className="font-mono text-[10px] sm:text-xs text-zinc-500 tracking-wider">
                DECLASSIFIED DOCUMENTS ARCHIVE
              </span>
            </div>
            <p className="font-mono text-[10px] text-zinc-600 text-center sm:text-right">
              PUBLIC DOMAIN • FOR EDUCATIONAL PURPOSES
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
