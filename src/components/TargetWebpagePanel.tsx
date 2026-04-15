import { useState } from "react";
import { Globe, ChevronDown, ChevronUp, Link as LinkIcon, Eye, EyeOff, Code, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

export interface AuthConfig {
  type: "none" | "basic" | "form-login";
  username: string;
  password: string;
}

interface Props {
  url: string;
  onUrlChange: (url: string) => void;
  auth: AuthConfig;
  onAuthChange: (auth: AuthConfig) => void;
  ignoreHeaderFooter: boolean;
  onIgnoreHeaderFooterChange: (val: boolean) => void;
  useHtmlPaste: boolean;
  onUseHtmlPasteChange: (val: boolean) => void;
  pastedHtml: string;
  onPastedHtmlChange: (val: string) => void;
}

const TargetWebpagePanel = ({
  url, onUrlChange, auth, onAuthChange,
  ignoreHeaderFooter, onIgnoreHeaderFooterChange,
  useHtmlPaste, onUseHtmlPasteChange,
  pastedHtml, onPastedHtmlChange,
}: Props) => {
  const [showAuth, setShowAuth] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const switchToPasteHtml = () => {
    onUseHtmlPasteChange(true);
    setShowAuth(false);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-3 flex items-center gap-2">
        <Globe className="h-5 w-5 text-accent" />
        <h2 className="text-lg font-semibold text-foreground">Target webpage</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">Enter the URL to verify against</p>

      {/* Toggle: URL fetch vs Paste HTML */}
      <div className="mb-4 flex gap-1 rounded-lg border border-border bg-secondary/30 p-1">
        <button
          onClick={() => onUseHtmlPasteChange(false)}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            !useHtmlPaste ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          <LinkIcon className="mr-1.5 inline h-3.5 w-3.5" />
          Fetch URL
        </button>
        <button
          onClick={() => onUseHtmlPasteChange(true)}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            useHtmlPaste ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          <Code className="mr-1.5 inline h-3.5 w-3.5" />
          Paste HTML
        </button>
      </div>

      {useHtmlPaste ? (
        <div className="mb-4">
          <Label htmlFor="pasted-html" className="mb-1.5 text-sm font-medium">
            Page Source HTML
          </Label>
          <textarea
            id="pasted-html"
            rows={6}
            placeholder="Right-click the page → View Page Source → Copy and paste here"
            value={pastedHtml}
            onChange={(e) => onPastedHtmlChange(e.target.value)}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y font-mono"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Use this when the URL can't be fetched directly (CORS, auth walls, staging sites).
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <Label htmlFor="page-url" className="mb-1.5 text-sm font-medium">
              Page URL
            </Label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="page-url"
                type="url"
                placeholder="https://example.com/page"
                value={url}
                onChange={(e) => onUrlChange(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <button
            onClick={() => setShowAuth(!showAuth)}
            className="mb-4 flex w-full items-center justify-between rounded-md border border-border bg-secondary/30 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary/50"
          >
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Authentication (Optional)
            </span>
            {showAuth ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showAuth && (
            <div className="mb-4 space-y-3 rounded-md border border-border bg-secondary/20 p-4">
              <div>
                <Label className="mb-1.5 text-sm">Auth Method</Label>
                <select
                  value={auth.type}
                  onChange={(e) => onAuthChange({ ...auth, type: e.target.value as AuthConfig["type"] })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="none">None</option>
                  <option value="basic">Basic Authentication (HTTP)</option>
                  <option value="form-login">Form-Based Login</option>
                </select>
              </div>

              {auth.type === "form-login" && (
                <div className="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/40">
                  <div className="flex gap-2">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    <div className="space-y-2 text-xs text-blue-800 dark:text-blue-300">
                      <p className="font-medium">Form-based login can't be automated from the browser</p>
                      <p>Login forms rely on session cookies that browsers block from being shared across origins. The fetch would just return the login page, not the content behind it.</p>
                      <p className="font-medium">Workaround — use Paste HTML:</p>
                      <ol className="ml-3 list-decimal space-y-0.5">
                        <li>Open the page in your browser and sign in normally</li>
                        <li>Once on the target page, right-click → <strong>View Page Source</strong></li>
                        <li>Select all (Ctrl+A) and copy</li>
                        <li>Switch to <strong>Paste HTML</strong> mode and paste it there</li>
                      </ol>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-1 h-7 border-blue-300 bg-white text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:bg-transparent dark:text-blue-300"
                        onClick={switchToPasteHtml}
                      >
                        <Code className="mr-1.5 h-3.5 w-3.5" />
                        Switch to Paste HTML
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {auth.type !== "none" && auth.type !== "form-login" && (
                <>
                  {auth.type === "basic" && (
                    <div>
                      <Label htmlFor="auth-user" className="mb-1.5 text-sm">Username / Email</Label>
                      <Input
                        id="auth-user"
                        type="text"
                        autoComplete="off"
                        placeholder="username"
                        value={auth.username}
                        onChange={(e) => onAuthChange({ ...auth, username: e.target.value })}
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="auth-pw" className="mb-1.5 text-sm">Password</Label>
                    <div className="relative">
                      <Input
                        id="auth-pw"
                        type={showPw ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        value={auth.password}
                        onChange={(e) => onAuthChange({ ...auth, password: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Credentials are used only for the fetch request and immediately cleared from memory.
                  </p>
                </>
              )}
            </div>
          )}
        </>
      )}

      <div className="flex items-center gap-2">
        <Checkbox
          id="ignore-hf"
          checked={ignoreHeaderFooter}
          onCheckedChange={(c) => onIgnoreHeaderFooterChange(c === true)}
        />
        <Label htmlFor="ignore-hf" className="text-sm cursor-pointer">
          Ignore header & footer on webpage
        </Label>
      </div>
    </div>
  );
};

export default TargetWebpagePanel;
