import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { FileText, Upload, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import mammoth from "mammoth";

interface Props {
  onFileSelected: (file: File) => void;
  selectedFile: File | null;
}

type PreviewContent =
  | { kind: "html"; html: string }
  | { kind: "blob"; url: string }
  | { kind: "text"; text: string };

function PreviewModal({ content, fileName, onClose }: { content: PreviewContent; fileName: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl h-[80vh] bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="font-bold text-foreground text-base truncate pr-4">{fileName}</h2>
          <button onClick={onClose} className="p-1 -mr-1 text-muted-foreground hover:text-foreground shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        {content.kind === "html" && (
          <div
            className="px-6 py-5 overflow-y-auto flex-1 prose prose-sm max-w-none text-foreground [&_a]:text-primary [&_a]:underline [&_a]:break-all"
            dangerouslySetInnerHTML={{ __html: content.html }}
            ref={(el) => {
              if (!el) return;
              el.querySelectorAll("a[href]").forEach((a) => {
                a.setAttribute("target", "_blank");
                a.setAttribute("rel", "noopener noreferrer");
              });
            }}
          />
        )}

        {content.kind === "blob" && (
          <iframe src={content.url} className="flex-1 w-full border-0" title={fileName} />
        )}

        {content.kind === "text" && (
          <pre className="px-6 py-5 overflow-y-auto flex-1 text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
            {content.text}
          </pre>
        )}
      </div>
    </div>
  );
}

const SourceDocumentPanel = ({ onFileSelected, selectedFile }: Props) => {
  const [preview, setPreview] = useState<PreviewContent | null>(null);

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) onFileSelected(accepted[0]);
    },
    [onFileSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
    },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
  });

  const handlePreview = async () => {
    if (!selectedFile) return;
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();

    if (ext === "pdf") {
      const url = URL.createObjectURL(selectedFile);
      setPreview({ kind: "blob", url });
    } else if (ext === "txt") {
      const text = await selectedFile.text();
      setPreview({ kind: "text", text });
    } else {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setPreview({ kind: "html", html: result.value });
    }
  };

  const handleClose = () => {
    if (preview?.kind === "blob") URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-3 flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Source document</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">Upload a .docx, .pdf, or .txt file</p>

      {selectedFile ? (
        <div className="flex items-center justify-between rounded-md border border-border bg-secondary/50 px-4 py-3 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground truncate">{selectedFile.name}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              ({(selectedFile.size / 1024).toFixed(1)} KB)
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={handlePreview} title="Preview document">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="hover:text-red-500 hover:bg-red-500/10" onClick={() => onFileSelected(null as unknown as File)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 transition-colors ${
            isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">Drag & drop your file</p>
          <p className="text-xs text-muted-foreground">.docx, .pdf, or .txt · click to browse</p>
        </div>
      )}

      {preview !== null && (
        <PreviewModal
          content={preview}
          fileName={selectedFile?.name ?? "Document"}
          onClose={handleClose}
        />
      )}
    </div>
  );
};

export default SourceDocumentPanel;
