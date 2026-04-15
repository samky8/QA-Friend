import { useState } from "react";
import {
  HelpCircle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  X,
  Info,
  Mail,
} from "lucide-react";

type FooterModal = "about" | "faq" | "feedback" | "contact" | null;

const APP_NAME = "QA Friend";
const VERSION = "v0.1.0";

/* ---------------- FAQS (QA TOOL) ---------------- */

const FAQS = [
  {
    q: "Is my data private?",
    a: "Yes. Your document is processed entirely in your browser and never uploaded or stored anywhere. The only exception is when fetching a webpage that blocks direct access — in that case the URL (not your document) is routed through a third-party CORS proxy.",
  },
  {
    q: "How does comparison work?",
    a: "The tool extracts visible text from both the Word document and webpage, then compares content intelligently so text can still match even if it has moved or been reformatted.",
  },
  {
    q: "What does 'moved' mean?",
    a: "Moved content exists on both the Word document and webpage, but appears in a different position on the page.",
  },
  {
    q: "How are hyperlinks checked?",
    a: "Hyperlinks are validated by comparing both the visible text and the underlying URL. If the URL changes, it is flagged as a link change.",
  },
  {
    q: "What counts as 'missing'?",
    a: "Missing content exists in the Word document but could not be found anywhere on the webpage.",
  },
];

/* ---------------- MODAL WRAPPER ---------------- */

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm px-4 pb-4">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bold text-foreground text-base">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 -mr-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ---------------- FAQ MODAL ---------------- */

function FAQModal({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <Modal title="FAQs" onClose={onClose}>
      <div className="space-y-2">
        {FAQS.map((faq, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-background/50 overflow-hidden"
          >
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold text-foreground"
              onClick={() => setOpen(open === i ? null : i)}
            >
              <span>{faq.q}</span>
              {open === i ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground ml-2" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground ml-2" />
              )}
            </button>

            {open === i && (
              <p className="px-4 pb-3 text-sm text-muted-foreground leading-relaxed">
                {faq.a}
              </p>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}

/* ---------------- FEEDBACK MODAL ---------------- */

function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <Modal title="Report an Issue" onClose={onClose}>
      {submitted ? (
        <div className="py-6 text-center space-y-2">
          <p className="text-2xl">✅</p>
          <p className="text-foreground font-semibold">Thanks!</p>
          <p className="text-sm text-muted-foreground">
            Your feedback helps improve comparison accuracy.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">
              What issue did you find?
            </p>
            <textarea
              className="w-full rounded-lg bg-input border border-border text-sm text-foreground px-3 py-2 resize-none"
              rows={4}
              placeholder="Describe incorrect matches, missing content, or link issues..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <button
            disabled={!message.trim()}
            onClick={() => setSubmitted(true)}
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40"
          >
            Submit
          </button>
        </div>
      )}
    </Modal>
  );
}

/* ---------------- ABOUT MODAL ---------------- */

function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="About" onClose={onClose}>
      <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">

        <div>
          <p className="text-foreground font-semibold mb-1">
            How it works
          </p>
          <p>
            The system extracts visible text from both sources and performs
            intelligent matching that accounts for moved, reformatted, or
            partially changed content. Perfect for content audits, website quality assurance checks, 
            and ensuring your published pages match your draft/source documents.
          </p>
        </div>

        <div>
          <p className="text-foreground font-semibold mb-1">
            Important note
          </p>
          <p>
            Results are automated and should be used as a review aid. Manual
            verification is still recommended for final publishing checks.
          </p>
        </div>

      </div>
    </Modal>
  );
}

/* ---------------- CONTACT MODAL ---------------- */

function ContactModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSend = () => {
    const to = atob("c2FtYnVya2U4QGxpdmUuY29t");
    const params = new URLSearchParams({ subject, body: `From: ${email}\n\n${message}` });
    window.location.href = `mailto:${to}?${params.toString()}`;
    setSubmitted(true);
  };

  const isValid = email.trim() && subject.trim() && message.trim();

  return (
    <Modal title="Contact" onClose={onClose}>
      {submitted ? (
        <div className="py-6 text-center space-y-2">
          <p className="text-2xl">✅</p>
          <p className="text-foreground font-semibold">Message sent!</p>
          <p className="text-sm text-muted-foreground">
            We'll get back to you as soon as possible.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Your Email</label>
            <input
              type="email"
              className="w-full rounded-lg bg-input border border-border text-sm text-foreground px-3 py-2"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Subject</label>
            <input
              type="text"
              className="w-full rounded-lg bg-input border border-border text-sm text-foreground px-3 py-2"
              placeholder="What's this about?"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Message</label>
            <textarea
              className="w-full rounded-lg bg-input border border-border text-sm text-foreground px-3 py-2 resize-none"
              rows={4}
              placeholder="Your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <button
            disabled={!isValid}
            onClick={handleSend}
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40"
          >
            Send
          </button>
        </div>
      )}
    </Modal>
  );
}

/* ---------------- FOOTER ---------------- */

export function Footer() {
  const [activeModal, setActiveModal] = useState<FooterModal>(null);
  const year = new Date().getFullYear();

  return (
    <>
      <footer className="border-t border-border bg-card/30 px-4 py-5 mt-6">
        <div className="max-w-lg mx-auto space-y-3">
          
          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            
            <button
              onClick={() => setActiveModal("about")}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Info className="h-3.5 w-3.5" />
              About
            </button>

            <button
              onClick={() => setActiveModal("faq")}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              FAQs
            </button>

            <button
              onClick={() => setActiveModal("feedback")}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Report Issue
            </button>

            <button
              onClick={() => setActiveModal("contact")}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Mail className="h-3.5 w-3.5" />
              Contact
            </button>
          </div>

          {/* System info row */}
          <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground/70">
            <span className="flex items-center gap-1">
              {APP_NAME}
            </span>
            <span>•</span>
            <span>{VERSION}</span>
            <span>•</span>
            <span>{year}</span>
          </div>
        </div>
      </footer>

      {activeModal === "faq" && (
        <FAQModal onClose={() => setActiveModal(null)} />
      )}

      {activeModal === "feedback" && (
        <FeedbackModal onClose={() => setActiveModal(null)} />
      )}

      {activeModal === "about" && (
        <AboutModal onClose={() => setActiveModal(null)} />
      )}

      {activeModal === "contact" && (
        <ContactModal onClose={() => setActiveModal(null)} />
      )}
    </>
  );
}