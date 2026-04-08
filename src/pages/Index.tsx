import { useState, useCallback } from "react";
import Header from "@/components/Header";
import SourceDocumentPanel from "@/components/SourceDocumentPanel";
import TargetWebpagePanel, { type AuthConfig } from "@/components/TargetWebpagePanel";
import DiffResults from "@/components/DiffResults";
import { Button } from "@/components/ui/button";
import { parseDocx } from "@/lib/docx-parser";
import { scrapeWebpage } from "@/lib/scraper";
import { compareDocuments, type ComparisonResult } from "@/lib/diff-engine";
import { exportToPdf } from "@/lib/export-report";
import { Loader2, Download, FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [auth, setAuth] = useState<AuthConfig>({ type: "none", username: "", password: "" });
  const [ignoreHeaderFooter, setIgnoreHeaderFooter] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [filter, setFilter] = useState<"all" | "changed" | "missing" | "extra" | "match">("all");
  const [screenshot, setScreenshot] = useState<string | null>(null);

  const clearCredentials = useCallback(() => {
    setAuth({ type: "none", username: "", password: "" });
  }, []);

  const handleCompare = async () => {
    if (!file) {
      toast({ title: "Missing document", description: "Please upload a .docx file.", variant: "destructive" });
      return;
    }

    // Basic URL validation
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error();
    } catch {
      toast({ title: "Invalid URL", description: "Please enter a valid http(s) URL.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);
    setScreenshot(null);

    try {
      // Parse DOCX and scrape in parallel
      const [docResult, webResult] = await Promise.all([
        parseDocx(file),
        scrapeWebpage({
          url: parsedUrl.toString(),
          ignoreHeaderFooter,
          auth: auth.type !== "none"
            ? { type: auth.type, username: auth.username, password: auth.password }
            : undefined,
        }),
      ]);

      // Clear credentials immediately after use
      clearCredentials();

      if (webResult.screenshotBase64) {
        setScreenshot(webResult.screenshotBase64);
      }

      const comparison = compareDocuments(docResult.sections, webResult.sections);
      setResult(comparison);
      setFilter("all");

      toast({
        title: "Comparison complete",
        description: `Found ${comparison.summary.changes} changes, ${comparison.summary.missing} missing sections.`,
      });
    } catch (err: unknown) {
      // Clear credentials on error too
      clearCredentials();
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = () => {
    if (!result) return;
    exportToPdf(result, file?.name || "document.docx", url);
    toast({ title: "Report exported", description: "PDF report has been downloaded." });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-foreground">QA Content Verification</h1>
          <p className="mt-2 text-muted-foreground">
            Compare spec documents directly against live webpages with precision.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <SourceDocumentPanel onFileSelected={setFile} selectedFile={file} />
          <TargetWebpagePanel
            url={url}
            onUrlChange={setUrl}
            auth={auth}
            onAuthChange={setAuth}
            ignoreHeaderFooter={ignoreHeaderFooter}
            onIgnoreHeaderFooterChange={setIgnoreHeaderFooter}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          {result && (
            <Button variant="outline" onClick={handleExportPdf}>
              <FileDown className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          )}
          <Button onClick={handleCompare} disabled={loading || !file || !url}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Comparing…
              </>
            ) : (
              "Compare Documents"
            )}
          </Button>
        </div>

        {screenshot && (
          <div className="mt-8">
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">Page Screenshot</h3>
            <img
              src={`data:image/png;base64,${screenshot}`}
              alt="Webpage screenshot"
              className="max-h-96 rounded-lg border border-border object-contain"
            />
          </div>
        )}

        {result && <DiffResults result={result} filter={filter} onFilterChange={setFilter} />}
      </main>
    </div>
  );
};

export default Index;
