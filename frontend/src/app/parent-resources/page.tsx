import { Metadata } from 'next';
import Link from 'next/link';
import { Shield, ArrowLeft, Heart, AlertTriangle, MessageCircle, Eye, Users, Phone, BookOpen, Lock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Protecting Your Children | Jeffrey Epstein - Photo Gallery',
  description: 'Essential resources for parents on how to protect children from predators, recognize warning signs, and have important conversations about safety.',
  openGraph: {
    title: 'Protecting Your Children | Jeffrey Epstein - Photo Gallery',
    description: 'Essential resources for parents on how to protect children from predators, recognize warning signs, and have important conversations about safety.',
    type: 'article',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Protecting Your Children - Parent Resources',
    description: 'Essential resources for parents on how to protect children from predators, recognize warning signs, and have important conversations about safety.',
  },
};

export default function ParentResourcesPage() {
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
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-500/10 border-2 border-blue-500/30">
              <Heart size={12} className="text-blue-500 sm:w-3.5 sm:h-3.5" />
              <span className="font-mono text-[9px] sm:text-[10px] font-bold tracking-[0.2em] sm:tracking-[0.25em] text-blue-500">
                PROTECTION
              </span>
            </div>
            <div className="h-3 sm:h-4 w-px bg-zinc-700" />
            <span className="font-mono text-[9px] sm:text-[10px] text-zinc-600 tracking-wider">
              PARENT RESOURCES
            </span>
          </div>

          {/* Title */}
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-semibold tracking-wide text-shadow-glow">
            <span className="text-gradient">PROTECTING YOUR CHILDREN</span>
          </h1>

          <p className="font-mono text-[10px] sm:text-xs text-zinc-500 tracking-[0.2em] sm:tracking-[0.3em] mt-2 sm:mt-3">
            ESSENTIAL SAFETY RESOURCES FOR PARENTS
          </p>

          <div className="flex items-center gap-3 mt-3 sm:mt-4">
            <div className="w-12 sm:w-16 h-px bg-gradient-to-r from-amber-500 to-transparent" />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Introduction */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 sm:p-6 mb-8">
          <div className="flex items-start gap-3">
            <Shield size={24} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-blue-200 font-medium">Why This Matters</p>
              <p className="text-zinc-300 text-sm mt-2">
                The Epstein case revealed how predators exploit trust, wealth, and social connections to 
                access children. Understanding their tactics is the first step to protecting your family. 
                Predators often target vulnerable children and use grooming techniques that can take months 
                or years to fully develop.
              </p>
            </div>
          </div>
        </div>

        <article className="prose prose-invert prose-zinc max-w-none">
          <h2 className="text-amber-500 font-serif flex items-center gap-3">
            <AlertTriangle size={24} />
            Recognizing Grooming Behaviors
          </h2>
          <p>
            Grooming is the process by which predators build trust with children and families before 
            committing abuse. Understanding these warning signs can help you protect your children.
          </p>

          <div className="not-prose grid gap-4 my-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <h3 className="text-amber-400 font-semibold mb-2">Excessive Attention & Gifts</h3>
              <p className="text-zinc-300 text-sm">
                Predators often single out a child for special attention, expensive gifts, or privileges 
                that seem &quot;too good to be true.&quot; They may offer opportunities like modeling careers, 
                scholarships, or connections—exactly what Epstein used to recruit victims.
              </p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <h3 className="text-amber-400 font-semibold mb-2">Boundary Pushing</h3>
              <p className="text-zinc-300 text-sm">
                Watch for adults who gradually push physical boundaries—inappropriate touching disguised 
                as affection, &quot;accidental&quot; contact, or insisting on privacy during activities. They test 
                how much they can get away with.
              </p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <h3 className="text-amber-400 font-semibold mb-2">Isolation Tactics</h3>
              <p className="text-zinc-300 text-sm">
                Predators work to separate children from their support networks. This can include creating 
                special &quot;secrets,&quot; driving wedges between the child and parents, or engineering situations 
                where they&apos;re alone with the child.
              </p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <h3 className="text-amber-400 font-semibold mb-2">Targeting Vulnerabilities</h3>
              <p className="text-zinc-300 text-sm">
                Children from troubled homes, those seeking attention, or those with low self-esteem are 
                often targeted. Predators present themselves as understanding allies who &quot;truly get&quot; the child.
              </p>
            </div>
          </div>

          <h2 className="text-amber-500 font-serif flex items-center gap-3">
            <MessageCircle size={24} />
            Having the Conversation
          </h2>
          <p>
            Open communication is one of the most powerful tools for protecting your children. Here&apos;s how 
            to approach these difficult but essential conversations:
          </p>

          <h3>Start Early and Age-Appropriately</h3>
          <ul>
            <li>
              <strong>Ages 2-5:</strong> Teach proper names for body parts. Explain that some parts are 
              &quot;private&quot; and that no one should touch them except for health reasons with a parent present.
            </li>
            <li>
              <strong>Ages 6-9:</strong> Explain the concept of inappropriate touching. Teach them to say &quot;NO&quot; 
              loudly and to always tell a trusted adult if something makes them uncomfortable.
            </li>
            <li>
              <strong>Ages 10-12:</strong> Discuss online safety, the reality of predators, and how grooming 
              works. Explain that adults who are appropriate do not ask children to keep secrets from parents.
            </li>
            <li>
              <strong>Teens:</strong> Have frank discussions about exploitation, consent, and recognizing 
              manipulation. Discuss real cases (age-appropriately) to illustrate how these situations happen.
            </li>
          </ul>

          <h3>Key Messages to Communicate</h3>
          <ul>
            <li><strong>&quot;You can always tell me anything.&quot;</strong> Make sure they know they won&apos;t get in trouble for reporting something.</li>
            <li><strong>&quot;Your body belongs to you.&quot;</strong> Empower them to say no to unwanted physical contact, even from family members.</li>
            <li><strong>&quot;Adults should never ask you to keep secrets from parents.&quot;</strong> Explain the difference between surprises (temporary, positive) and secrets (ongoing, often make you feel bad).</li>
            <li><strong>&quot;Trust your feelings.&quot;</strong> If something feels wrong, it probably is. They should always tell a trusted adult.</li>
            <li><strong>&quot;It&apos;s never your fault.&quot;</strong> If something does happen, they need to know they are not to blame.</li>
          </ul>

          <h2 className="text-amber-500 font-serif flex items-center gap-3">
            <Eye size={24} />
            Warning Signs of Abuse
          </h2>
          <p>
            While these signs don&apos;t always indicate abuse, they warrant attention and gentle inquiry:
          </p>

          <div className="not-prose grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <h3 className="text-red-400 font-semibold mb-2">Behavioral Changes</h3>
              <ul className="text-zinc-300 text-sm space-y-1">
                <li>• Sudden withdrawal or anxiety</li>
                <li>• Fear of specific people or places</li>
                <li>• Regression to younger behaviors</li>
                <li>• Sleep disturbances or nightmares</li>
                <li>• Sudden drop in school performance</li>
              </ul>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <h3 className="text-red-400 font-semibold mb-2">Physical/Emotional Signs</h3>
              <ul className="text-zinc-300 text-sm space-y-1">
                <li>• Unexplained gifts or money</li>
                <li>• Sexual knowledge beyond their age</li>
                <li>• Physical symptoms without explanation</li>
                <li>• Self-harm or talk of suicide</li>
                <li>• Secretive about online activities</li>
              </ul>
            </div>
          </div>

          <h2 className="text-amber-500 font-serif flex items-center gap-3">
            <Lock size={24} />
            Online Safety
          </h2>
          <p>
            The internet has created new avenues for predators to reach children. Epstein&apos;s network used 
            social connections, but today&apos;s predators often use social media and gaming platforms.
          </p>

          <h3>Essential Online Safety Measures</h3>
          <ul>
            <li><strong>Monitor social media:</strong> Know what platforms your child uses and maintain access to their accounts until they&apos;re mature enough to handle them safely.</li>
            <li><strong>Keep devices in common areas:</strong> Computers and gaming systems should be in family spaces, not bedrooms.</li>
            <li><strong>Discuss online predators:</strong> Explain that people online may not be who they claim to be.</li>
            <li><strong>Set clear rules:</strong> No sharing personal information, no meeting online friends in person, no keeping online relationships secret.</li>
            <li><strong>Use parental controls:</strong> But remember, they&apos;re not foolproof—conversation is still essential.</li>
          </ul>

          <h2 className="text-amber-500 font-serif flex items-center gap-3">
            <Users size={24} />
            Vetting Adults in Your Child&apos;s Life
          </h2>
          <p>
            Most abuse occurs by someone the child and family knows and trusts. Be thoughtful about who 
            has access to your children:
          </p>
          <ul>
            <li>Research coaches, tutors, and mentors. Trust your instincts about people.</li>
            <li>Be cautious of any adult who wants unusual alone time with your child.</li>
            <li>Question any adult who treats your child as a peer or &quot;special friend.&quot;</li>
            <li>Pay attention to how adults in your child&apos;s life respect boundaries.</li>
            <li>Teach your child that they can say no to adults, even authority figures, if something feels wrong.</li>
          </ul>
        </article>

        {/* Crisis Resources */}
        <div className="mt-12 pt-8 border-t border-zinc-800">
          <h3 className="font-serif text-2xl text-amber-500 mb-6 flex items-center gap-3">
            <Phone size={24} />
            If You Need Help
          </h3>
          
          <div className="grid gap-4">
            <a
              href="tel:1-800-422-4453"
              className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 hover:border-amber-500/50 transition-colors group block"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-semibold group-hover:text-amber-400 transition-colors">
                    Childhelp National Child Abuse Hotline
                  </h4>
                  <p className="text-zinc-400 text-sm mt-1">
                    24/7 crisis intervention, support, and referrals
                  </p>
                </div>
                <span className="text-amber-500 font-mono text-lg">1-800-422-4453</span>
              </div>
            </a>

            <a
              href="tel:1-800-656-4673"
              className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 hover:border-amber-500/50 transition-colors group block"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-semibold group-hover:text-amber-400 transition-colors">
                    RAINN (Rape, Abuse & Incest National Network)
                  </h4>
                  <p className="text-zinc-400 text-sm mt-1">
                    24/7 support for survivors of sexual violence
                  </p>
                </div>
                <span className="text-amber-500 font-mono text-lg">1-800-656-4673</span>
              </div>
            </a>

            <a
              href="https://www.cybertipline.org"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 hover:border-amber-500/50 transition-colors group block"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-semibold group-hover:text-amber-400 transition-colors">
                    CyberTipline (NCMEC)
                  </h4>
                  <p className="text-zinc-400 text-sm mt-1">
                    Report online exploitation of children
                  </p>
                </div>
                <span className="text-amber-500 font-mono text-sm">cybertipline.org</span>
              </div>
            </a>

            <a
              href="tel:1-800-843-5678"
              className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 hover:border-amber-500/50 transition-colors group block"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-semibold group-hover:text-amber-400 transition-colors">
                    National Center for Missing & Exploited Children
                  </h4>
                  <p className="text-zinc-400 text-sm mt-1">
                    24/7 hotline for missing children and exploitation
                  </p>
                </div>
                <span className="text-amber-500 font-mono text-lg">1-800-843-5678</span>
              </div>
            </a>
          </div>
        </div>

        {/* Related links */}
        <div className="mt-12 pt-8 border-t border-zinc-800">
          <h3 className="font-mono text-xs text-zinc-400 tracking-wider mb-4">RELATED RESOURCES</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/who-is-jeffrey-epstein"
              className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 hover:border-amber-500/50 transition-colors group"
            >
              <div className="flex items-center gap-2 text-amber-500 mb-2">
                <BookOpen size={16} />
                <span className="font-mono text-xs">BACKGROUND</span>
              </div>
              <p className="text-zinc-300 text-sm group-hover:text-white transition-colors">
                Learn about Jeffrey Epstein and why this case matters.
              </p>
            </Link>
            <Link
              href="/"
              className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 hover:border-amber-500/50 transition-colors group"
            >
              <div className="flex items-center gap-2 text-amber-500 mb-2">
                <Shield size={16} />
                <span className="font-mono text-xs">BROWSE ARCHIVE</span>
              </div>
              <p className="text-zinc-300 text-sm group-hover:text-white transition-colors">
                Explore the declassified documents and images.
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
