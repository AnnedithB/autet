import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Sparkles, Database, Shield, Zap, UploadCloud } from 'lucide-react';
import DOMPurify from "dompurify";

const Dashboard = () => {
  const [appId, setAppId] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState('');
  const [selectedApk, setSelectedApk] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [apkStatus, setApkStatus] = useState('');
  const [apkUploaded, setApkUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const uploadTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (uploadTimeoutRef.current) {
        window.clearTimeout(uploadTimeoutRef.current);
      }
    };
  }, []);

  const getNoticeClasses = (message: string) => {
    const normalized = message.toLowerCase();

    if (
      normalized.includes('success') ||
      normalized.includes('submitted') ||
      normalized.includes('completed') ||
      normalized.includes('ready') ||
      normalized.includes('upload successful')
    ) {
      return 'bg-primary/10 border-primary text-primary';
    }

    if (
      normalized.includes('error') ||
      normalized.includes('network') ||
      normalized.includes('please')
    ) {
      return 'bg-destructive/10 border-destructive text-destructive';
    }

    return 'bg-muted border-border text-foreground';
  };

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelection = (file: File | null) => {
    if (uploadTimeoutRef.current) {
      window.clearTimeout(uploadTimeoutRef.current);
      uploadTimeoutRef.current = null;
    }

    if (!file) {
      setSelectedApk(null);
      setApkUploaded(false);
      setIsUploading(false);
      return;
    }

    if (!file.name.toLowerCase().endsWith('.apk')) {
      setApkStatus('Only .apk files are supported');
      setSelectedApk(null);
      resetFileInput();
      setApkUploaded(false);
      setIsUploading(false);
      return;
    }

    setSelectedApk(file);
    setApkUploaded(false);
    setIsUploading(true);
    setApkStatus('');

    uploadTimeoutRef.current = window.setTimeout(() => {
      setIsUploading(false);
      setApkUploaded(true);
      setApkStatus(`APK ready for scraping: ${file.name}`);
      resetFileInput();
      uploadTimeoutRef.current = null;
    }, 1500);
  };

  const handleScrape = async () => {
    if (!appId.trim()) {
      setScrapeStatus('Please enter an App ID');
      return;
    }

    if (!apkUploaded) {
      setScrapeStatus('Please upload your APK before scraping reviews');
      return;
    }
    setIsScraping(true);
    setScrapeStatus('Submitting...');

    try {
      // Send request to backend endpoint with the entered App ID
      const url = `/api/submit-appId/${encodeURIComponent(appId)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        // body is optional since appId is in the URL
        body: JSON.stringify({ appId })
      });

      if (!res.ok) {
        const text = await res.text();
        setScrapeStatus(`Error: ${res.status} ${text}`);
      } else {
        // backend accepted the request
        setScrapeStatus('Submitted successfully. Processing started.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setScrapeStatus(`Network error: ${msg}`);
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Welcome Section */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Manage your app review analysis</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 mb-12">
            {/* Quick Stats */}
            <div className="bg-card border border-border p-6 holo-card">
              <Sparkles className="text-primary mb-3" size={24} />
              <h3 className="text-2xl font-bold mb-1">0</h3>
              <p className="text-sm text-muted-foreground">Reviews Scraped</p>
            </div>
            <div className="bg-card border border-border p-6 holo-card">
              <Database className="text-secondary mb-3" size={24} />
              <h3 className="text-2xl font-bold mb-1">0</h3>
              <p className="text-sm text-muted-foreground">Apps Tracked</p>
            </div>
            <div className="bg-card border border-border p-6 holo-card">
              <Shield className="text-accent mb-3" size={24} />
              <h3 className="text-2xl font-bold mb-1">Active</h3>
              <p className="text-sm text-muted-foreground">Account Status</p>
            </div>
            <div className="bg-card border border-border p-6 holo-card">
              <Zap className="text-primary mb-3" size={24} />
              <h3 className="text-2xl font-bold mb-1">Ready</h3>
              <p className="text-sm text-muted-foreground">System Status</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            {/* Scrape Reviews Section */}
            <div className="bg-card border border-border p-8 holo-card">
              <h2 className="text-2xl font-bold mb-2">Scrape Reviews</h2>
              <p className="text-muted-foreground mb-6">
                Enter an App ID to start scraping and analyzing reviews
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="appId">App ID</Label>
                  <Input
                    id="appId"
                    type="text"
                    placeholder="com.example.app"
                    value={appId}
                    onChange={(e) => {
                      const sanitized = DOMPurify.sanitize(e.target.value);   //passes value to dom purify , checks if values in whitelist
                      setAppId(sanitized);                                    //not in whitelist = js / tags etc
                    }}
                    className="bg-input border-border"
                    disabled={isScraping}
                  />
                </div>

                <Button
                  onClick={handleScrape}
                  disabled={isScraping}
                  className="bg-primary text-primary-foreground hover:bg-secondary"
                >
                  {isScraping ? 'Scraping...' : 'Start Scraping'}
                </Button>

                {scrapeStatus && (
                  <div className={`p-4 border rounded ${getNoticeClasses(scrapeStatus)}`}>
                    {scrapeStatus}
                  </div>
                )}
              </div>
            </div>

            {/* Upload APK Section */}
            <div className="bg-card flex flex-col items-center justify-center holo-card">
              

              <div
                className={`p-2 flex flex-1 w-[100%] flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200 ${
                  isDragActive ? 'border-primary bg-primary/5' : 'border-border/60 bg-card/60'
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragActive(true);
                }}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsDragActive(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragActive(false);
                  const file = event.dataTransfer.files?.[0] ?? null;
                  handleFileSelection(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                <UploadCloud className="text-muted-foreground" size={56} />
                <p className="mt-4 text-lg font-semibold">Upload APK</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Drag and drop your file here, or <span className="text-primary">click to select</span>.
                </p>
                <p className="mt-4 text-xs text-muted-foreground">Supported format: .apk</p>
                {isUploading && selectedApk && (
                  <div className="mt-6 flex items-center gap-2 text-sm text-primary">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Uploading {selectedApk.name}...
                  </div>
                )}
                {!isUploading && selectedApk && (
                  <p className="mt-6 text-sm font-medium text-primary">Ready: {selectedApk.name}</p>
                )}
                <input
                  id="apkUpload"
                  type="file"
                  accept=".apk"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(event) => handleFileSelection(event.target.files?.[0] ?? null)}
                />
              </div>

              

              {apkStatus && (
                <div className={`mt-4 p-4 border rounded ${getNoticeClasses(apkStatus)}`}>
                  {apkStatus}
                </div>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            <div className="bg-card border border-border p-6 transition-colors cursor-pointer holo-card">
              <h3 className="font-semibold mb-2">Overview</h3>
              <p className="text-sm text-muted-foreground">View your analytics dashboard</p>
            </div>
            <div className="bg-card border border-border p-6 transition-colors cursor-pointer holo-card">
              <h3 className="font-semibold mb-2">Settings</h3>
              <p className="text-sm text-muted-foreground">Manage your account preferences</p>
            </div>
            <div className="bg-card border border-border p-6 transition-colors cursor-pointer holo-card">
              <h3 className="font-semibold mb-2">History</h3>
              <p className="text-sm text-muted-foreground">View past scraping results</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
