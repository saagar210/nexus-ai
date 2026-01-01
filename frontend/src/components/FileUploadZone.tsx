import { useState, useCallback, useRef } from "react";
import {
  Upload,
  File,
  FileText,
  Image,
  X,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";

interface UploadFile {
  id: string;
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSizeBytes?: number;
  acceptedTypes?: string[];
  compact?: boolean;
  disabled?: boolean;
}

const FILE_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileText size={20} className="text-red-500" />,
  doc: <FileText size={20} className="text-blue-500" />,
  docx: <FileText size={20} className="text-blue-500" />,
  txt: <FileText size={20} className="text-gray-500" />,
  md: <FileText size={20} className="text-gray-500" />,
  png: <Image size={20} className="text-green-500" />,
  jpg: <Image size={20} className="text-green-500" />,
  jpeg: <Image size={20} className="text-green-500" />,
  default: <File size={20} className="text-muted-foreground" />,
};

function getFileIcon(filename: string): React.ReactNode {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return FILE_ICONS[ext] || FILE_ICONS.default;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileUploadZone({
  onFilesSelected,
  maxFiles = 10,
  maxSizeBytes = 50 * 1024 * 1024, // 50MB
  acceptedTypes,
  compact = false,
  disabled = false,
}: FileUploadZoneProps): React.ReactElement {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (file.size > maxSizeBytes) {
        return `File too large (max ${formatFileSize(maxSizeBytes)})`;
      }
      if (acceptedTypes && acceptedTypes.length > 0) {
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (!ext || !acceptedTypes.includes(`.${ext}`)) {
          return `File type not accepted`;
        }
      }
      return null;
    },
    [maxSizeBytes, acceptedTypes],
  );

  const processFiles = useCallback(
    (fileList: FileList | File[]) => {
      const newFiles: UploadFile[] = [];
      const filesArray = Array.from(fileList).slice(0, maxFiles - files.length);

      for (const file of filesArray) {
        const error = validateFile(file);
        newFiles.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          status: error ? "error" : "pending",
          progress: 0,
          error: error || undefined,
        });
      }

      setFiles((prev) => [...prev, ...newFiles]);
      onFilesSelected(newFiles.filter((f) => !f.error).map((f) => f.file));
    },
    [files.length, maxFiles, validateFile, onFilesSelected],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const { files: droppedFiles } = e.dataTransfer;
      if (droppedFiles.length > 0) {
        processFiles(droppedFiles);
      }
    },
    [disabled, processFiles],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (selectedFiles && selectedFiles.length > 0) {
        processFiles(selectedFiles);
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [processFiles],
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setFiles([]);
  }, []);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
          accept={acceptedTypes?.join(",")}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
          title="Attach files"
        >
          <Upload size={20} className="text-muted-foreground" />
        </button>
        {files.length > 0 && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>{files.length} file(s)</span>
            <button
              onClick={clearAll}
              className="p-1 hover:bg-muted rounded"
              title="Clear all"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-colors
          ${isDragging ? "border-nexus-500 bg-nexus-500/10" : "border-border hover:border-muted-foreground"}
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
          accept={acceptedTypes?.join(",")}
        />
        <Upload
          size={40}
          className={`mx-auto mb-4 ${isDragging ? "text-nexus-500" : "text-muted-foreground"}`}
        />
        <p className="text-lg font-medium mb-1">
          {isDragging ? "Drop files here" : "Drag & drop files here"}
        </p>
        <p className="text-sm text-muted-foreground">
          or click to browse • Max {formatFileSize(maxSizeBytes)} per file
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{files.length} file(s)</span>
            <button
              onClick={clearAll}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-muted rounded-lg"
              >
                {getFileIcon(file.file.name)}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{file.file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatFileSize(file.file.size)}
                    {file.error && (
                      <span className="text-destructive ml-2">
                        • {file.error}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {file.status === "uploading" && (
                    <Loader2
                      size={16}
                      className="animate-spin text-nexus-500"
                    />
                  )}
                  {file.status === "success" && (
                    <Check size={16} className="text-green-500" />
                  )}
                  {file.status === "error" && (
                    <AlertCircle size={16} className="text-destructive" />
                  )}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1 hover:bg-background rounded"
                  >
                    <X size={14} className="text-muted-foreground" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
