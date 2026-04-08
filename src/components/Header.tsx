import { FileCheck2 } from "lucide-react";

const Header = () => (
  <header className="border-b border-border bg-card px-6 py-3">
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
        <FileCheck2 className="h-4 w-4 text-primary-foreground" />
      </div>
      <span className="text-lg font-semibold text-foreground">Content Verifier</span>
    </div>
  </header>
);

export default Header;
