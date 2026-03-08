import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Sparkles, Database, Zap, UploadCloud, Brain, TestTube, Settings, Check, ChevronRight, Navigation } from 'lucide-react';
import DOMPurify from "dompurify";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

const STEPS = [
  { id: 1, label: 'App ID' },
  { id: 2, label: 'Scrape' },
  { id: 3, label: 'Classify' },
  { id: 4, label: 'Test Cases' },
  { id: 5, label: 'Settings & APK' },
];

const Dashboard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [appId, setAppId] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState('');
  const [scrapeCount, setScrapeCount] = useState(0);
  const [scrapeProgressStatus, setScrapeProgressStatus] = useState<'idle' | 'running' | 'paused' | 'stopping' | 'cleaning' | 'ready' | 'completed'>('idle');
  const [scrapeFromStart, setScrapeFromStart] = useState(false); // false = resume from checkpoint, true = start from beginning
  const [isStopping, setIsStopping] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [selectedApk, setSelectedApk] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [apkStatus, setApkStatus] = useState('');
  const [apkUploaded, setApkUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const uploadTimeoutRef = useRef<number | null>(null);
  const [isStartingNavigation, setIsStartingNavigation] = useState(false);
  const [navigationStatus, setNavigationStatus] = useState('');
  const [startEmulatorWithNavigation, setStartEmulatorWithNavigation] = useState(true);
  const [uploadedApkPath, setUploadedApkPath] = useState('');

  const [useCustomThreshold, setUseCustomThreshold] = useState(false);
  const [threshold, setThreshold] = useState([0.5]);
  const [isClassifying, setIsClassifying] = useState(false);
  const [classificationStatus, setClassificationStatus] = useState('');
  const [classificationStats, setClassificationStats] = useState<any>(null);
  const [classifyRemaining, setClassifyRemaining] = useState<number | null>(null);
  const [classifyRunningTotal, setClassifyRunningTotal] = useState(0);

  const [isGeneratingTestCases, setIsGeneratingTestCases] = useState(false);
  const [testCaseStatus, setTestCaseStatus] = useState('');
  const [testCaseStats, setTestCaseStats] = useState<any>(null);
  const [batchSize, setBatchSize] = useState(10);
  const [displayCount, setDisplayCount] = useState(0);
  const displayCountRef = useRef(0);

  useEffect(() => {
    return () => {
      if (uploadTimeoutRef.current) window.clearTimeout(uploadTimeoutRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const fetchScrapeProgress = useCallback(async () => {
    if (!appId.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/scrape/progress?appId=${encodeURIComponent(appId)}`);
      if (res.ok) {
        const data = await res.json();
        setScrapeCount(data.count ?? 0);
        const status = (data.status ?? 'idle') as typeof scrapeProgressStatus;
        setScrapeProgressStatus((prev) => {
          // "ready" is a terminal state -- only reset from idle/explicit user action
          if (prev === 'ready' || prev === 'completed') return prev;
          // Don't regress from running to idle (stale file)
          if (status === 'idle' && (prev === 'running' || prev === 'paused' || prev === 'stopping' || prev === 'cleaning')) return prev;
          return status;
        });
      }
    } catch {
      // ignore
    }
  }, [appId]);

  useEffect(() => {
    if (currentStep !== 2 || !appId.trim()) return;
    const shouldPoll = ['running', 'paused', 'stopping', 'cleaning'].includes(scrapeProgressStatus);
    if (!shouldPoll) return;
    fetchScrapeProgress();
    pollRef.current = setInterval(fetchScrapeProgress, 1500);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [currentStep, appId, scrapeProgressStatus, fetchScrapeProgress]);

  useEffect(() => {
    if (scrapeCount <= displayCountRef.current) {
      displayCountRef.current = scrapeCount;
      setDisplayCount(scrapeCount);
      return;
    }
    const target = scrapeCount;
    const start = displayCountRef.current;
    const duration = 400;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const value = Math.round(start + (target - start) * eased);
      displayCountRef.current = value;
      setDisplayCount(value);
      if (t < 1) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [scrapeCount]);

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

  const handleFileSelection = async (file: File | null) => {
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
    setApkStatus('Uploading APK to server...');

    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/api/appium/upload-apk`, { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.path) {
        setApkUploaded(true);
        setUploadedApkPath(data.path);
        setApkStatus(`APK uploaded: ${file.name}`);
      } else {
        setApkStatus(`Upload failed: ${data.error || res.statusText}`);
        setSelectedApk(null);
      }
    } catch (err) {
      setApkStatus(`Upload error: ${err instanceof Error ? err.message : String(err)}`);
      setSelectedApk(null);
    } finally {
      setIsUploading(false);
      resetFileInput();
    }
  };

  const handleStartNavigation = async () => {
    setIsStartingNavigation(true);
    setNavigationStatus('');
    try {
      let url = `${API_BASE}/api/appium/start-navigation?startEmulator=${startEmulatorWithNavigation}`;
      if (uploadedApkPath) url += `&apkPath=${encodeURIComponent(uploadedApkPath)}`;
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (res.status === 202 || data.status === 'started')) {
        setNavigationStatus(data.message || 'Appium navigation started. Check backend/appium_navigation_log.txt for output.');
      } else {
        setNavigationStatus(data.error || `Error: ${res.status}`);
      }
    } catch (err) {
      setNavigationStatus(`Network error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsStartingNavigation(false);
    }
  };

  const handleScrape = async () => {
    if (!appId.trim()) {
      setScrapeStatus('Please enter an App ID');
      return;
    }
    setIsScraping(true);
    setScrapeStatus('');
    try {
      const baseUrl = `${API_BASE || window.location.origin}/api/submit-appId/${encodeURIComponent(appId)}`;
      const url = scrapeFromStart ? `${baseUrl}?fromStart=true` : baseUrl;
      console.log('[Scrape] POST', url, scrapeFromStart ? '(from start)' : '(from checkpoint)');
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId }),
      });
      if (!res.ok) {
        const text = await res.text();
        setScrapeStatus(`Error: ${res.status} ${text}`);
      } else {
        setScrapeStatus('Scraping started. Count updates in real time.');
        setScrapeProgressStatus('running');
      }
    } catch (err) {
      setScrapeStatus(`Network error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsScraping(false);
    }
  };

  const handleStopAndProceed = async () => {
    if (!appId.trim()) return;
    setIsStopping(true);
    setScrapeProgressStatus('stopping');
    try {
      const res = await fetch(`${API_BASE}/api/scrape/stop?appId=${encodeURIComponent(appId)}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setScrapeCount(data.reviewsScraped ?? scrapeCount);
        setScrapeStatus(data.message || 'Scrape stopped. Cleaning reviews...');
      } else {
        setScrapeStatus('Failed to stop scraper.');
      }
    } catch (err) {
      setScrapeStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsStopping(false);
    }
  };

  const handleResumeScraping = async () => {
    if (!appId.trim()) return;
    try {
      await fetch(`${API_BASE}/api/scrape/resume?appId=${encodeURIComponent(appId)}`, { method: 'POST' });
      setScrapeProgressStatus('running');
    } catch (err) {
      setScrapeStatus(`Error resuming: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const canProceedFromScrape = scrapeProgressStatus === 'ready' || scrapeProgressStatus === 'completed';

  const handleClassifyReviews = async () => {
    if (!appId.trim()) {
      setClassificationStatus('Please enter an App ID');
      return;
    }
    
    setIsClassifying(true);
    setClassificationStatus('Classifying reviews (batch of 10)...');
    
    try {
      const selectedThreshold = useCustomThreshold ? threshold[0] : undefined;
      const url = `${API_BASE}/api/classification/classify-reviews?appId=${encodeURIComponent(
        appId
      )}&limit=10${selectedThreshold !== undefined ? `&threshold=${selectedThreshold}` : ''}`;
      
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: 'Unknown error' }));
        const msg = [errorData.detail, errorData.error].filter(Boolean).join(' — ') || res.statusText;
        console.error('[Classification]', res.status, errorData);
        setClassificationStatus(`Error: ${msg}`);
      } else {
        const data = await res.json();
        setClassificationStats(data);
        const batchProcessed = data.processed ?? 0;
        setClassifyRunningTotal(prev => prev + batchProcessed);
        const remaining = data.remaining ?? 0;
        setClassifyRemaining(remaining);
        if (remaining > 0) {
          setClassificationStatus(`Classified ${batchProcessed} reviews. ${remaining} remaining.`);
        } else {
          setClassificationStatus(`Complete! All reviews classified.`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setClassificationStatus(`Network error: ${msg}`);
    } finally {
      setIsClassifying(false);
    }
  };

  const handleGenerateTestCases = async () => {
    if (!appId.trim()) {
      setTestCaseStatus('Please enter an App ID');
      return;
    }
    
    setIsGeneratingTestCases(true);
    setTestCaseStatus('Generating test cases...');
    
    try {
      const url = `${API_BASE}/api/test-cases/generate-batch?appId=${encodeURIComponent(appId)}&batch_size=${batchSize}`;
      
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: 'Unknown error' }));
        setTestCaseStatus(`Error: ${errorData.detail || res.statusText}`);
      } else {
        const data = await res.json();
        setTestCaseStats(data);
        setTestCaseStatus(`Success! Generated ${data.processed} test cases.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestCaseStatus(`Network error: ${msg}`);
    } finally {
      setIsGeneratingTestCases(false);
    }
  };

  const fetchStats = async () => {
    if (!appId.trim()) return;
    try {
      const [classifyRes, testCaseRes] = await Promise.all([
        fetch(`${API_BASE}/api/classification/stats?appId=${encodeURIComponent(appId)}`),
        fetch(`${API_BASE}/api/test-cases/stats?appId=${encodeURIComponent(appId)}`),
      ]);
      if (classifyRes.ok) {
        const data = await classifyRes.json();
        setClassificationStats(data);
      }
      if (testCaseRes.ok) {
        const data = await testCaseRes.json();
        setTestCaseStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    if (!appId.trim()) return;
    const t = setTimeout(fetchStats, 400);
    return () => clearTimeout(t);
  }, [appId]);

  // When entering Classify step, refresh stats so user sees count (and background classification result)
  useEffect(() => {
    if (currentStep === 3 && appId.trim()) {
      fetchStats();
      const interval = setInterval(fetchStats, 3000);
      return () => clearInterval(interval);
    }
  }, [currentStep, appId]);

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
              <h3 className="text-2xl font-bold mb-1">{classificationStats?.total_classified || 0}</h3>
              <p className="text-sm text-muted-foreground">Reviews Classified</p>
            </div>
            <div className="bg-card border border-border p-6 holo-card">
              <TestTube className="text-secondary mb-3" size={24} />
              <h3 className="text-2xl font-bold mb-1">{testCaseStats?.total_test_cases || 0}</h3>
              <p className="text-sm text-muted-foreground">Test Cases Generated</p>
            </div>
            <div className="bg-card border border-border p-6 holo-card">
              <Database className="text-accent mb-3" size={24} />
              <h3 className="text-2xl font-bold mb-1">{appId ? '1' : '0'}</h3>
              <p className="text-sm text-muted-foreground">Apps Tracked</p>
            </div>
            <div className="bg-card border border-border p-6 holo-card">
              <Zap className="text-primary mb-3" size={24} />
              <h3 className="text-2xl font-bold mb-1">
                {testCaseStats?.coverage_percentage ? `${testCaseStats.coverage_percentage}%` : '0%'}
              </h3>
              <p className="text-sm text-muted-foreground">Test Coverage</p>
            </div>
          </div>

          {/* Stepper */}
          <div className="mb-8 flex flex-wrap items-center gap-2">
            {STEPS.map((step, i) => (
              <span key={step.id} className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                    currentStep > step.id
                      ? 'bg-primary text-primary-foreground'
                      : currentStep === step.id
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {currentStep > step.id ? <Check size={16} /> : step.id}
                </span>
                <span className={currentStep === step.id ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                  {step.label}
                </span>
                {i < STEPS.length - 1 && <ChevronRight className="text-muted-foreground" size={16} />}
              </span>
            ))}
          </div>

          {/* Step 1: App ID */}
          {currentStep === 1 && (
            <Card className="max-w-lg">
              <CardHeader>
                <CardTitle>Enter App ID</CardTitle>
                <CardDescription>
                  Enter the Google Play Store App ID to scrape reviews (e.g. com.example.app).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="appId">App ID</Label>
                  <Input
                    id="appId"
                    type="text"
                    placeholder="com.example.app"
                    value={appId}
                    onChange={(e) => setAppId(DOMPurify.sanitize(e.target.value))}
                    className="bg-input border-border"
                  />
                </div>
                <Button
                  onClick={() => setCurrentStep(2)}
                  disabled={!appId.trim()}
                  className="w-full bg-primary text-primary-foreground hover:bg-secondary"
                >
                  Next: Scrape reviews
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Scrape with live counter */}
          {currentStep === 2 && (
            <Card className="max-w-2xl">
              <CardHeader>
                <CardTitle>Scrape reviews</CardTitle>
                <CardDescription>
                  Reviews are fetched from the Play Store. You can stop anytime and proceed with what was scraped.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm text-muted-foreground">App ID: <strong>{appId}</strong></p>
                {scrapeProgressStatus === 'idle' && (
                  <>
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Scrape mode</Label>
                      <div className="flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="scrapeMode"
                            checked={!scrapeFromStart}
                            onChange={() => setScrapeFromStart(false)}
                            className="rounded-full"
                          />
                          <span className="text-sm">Resume from checkpoint</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="scrapeMode"
                            checked={scrapeFromStart}
                            onChange={() => setScrapeFromStart(true)}
                            className="rounded-full"
                          />
                          <span className="text-sm">Start from beginning</span>
                        </label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {scrapeFromStart ? 'Ignore saved progress and fetch from page 0.' : 'Continue from last saved position (if any).'}
                      </p>
                    </div>
                    <Button
                      onClick={handleScrape}
                      disabled={isScraping || !appId.trim()}
                      className="w-full bg-primary text-primary-foreground hover:bg-secondary"
                    >
                      {isScraping ? 'Starting...' : 'Start scraping'}
                    </Button>
                  </>
                )}
                {scrapeProgressStatus !== 'idle' && (
                  <>
                    <div className="flex flex-col items-center py-8">
                      <span className="text-sm text-muted-foreground mb-2">Reviews scraped</span>
                      <span className={`text-5xl font-bold tabular-nums text-primary transition-all duration-300 ease-out ${scrapeProgressStatus === 'running' ? 'animate-pulse' : ''}`}>
                        {displayCount.toLocaleString()}
                      </span>
                      <span className="mt-2 text-sm text-muted-foreground">
                        {scrapeProgressStatus === 'running' && 'Scraping...'}
                        {scrapeProgressStatus === 'paused' && 'Paused — scrape more or proceed to classify?'}
                        {scrapeProgressStatus === 'stopping' && 'Stopping...'}
                        {scrapeProgressStatus === 'cleaning' && 'Cleaning & importing reviews...'}
                        {scrapeProgressStatus === 'ready' && 'Ready to classify'}
                        {scrapeProgressStatus === 'completed' && 'Complete'}
                      </span>
                    </div>
                    {scrapeProgressStatus === 'running' && (
                      <Button
                        variant="destructive"
                        onClick={handleStopAndProceed}
                        disabled={isStopping}
                        className="w-full"
                      >
                        {isStopping ? 'Stopping…' : 'Stop scraping'}
                      </Button>
                    )}
                    {scrapeProgressStatus === 'paused' && (
                      <div className="flex gap-3">
                        <Button
                          onClick={handleResumeScraping}
                          className="flex-1 bg-primary text-primary-foreground hover:bg-secondary"
                        >
                          Continue scraping
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleStopAndProceed}
                          disabled={isStopping}
                          className="flex-1"
                        >
                          {isStopping ? 'Stopping…' : 'Stop & proceed to classify'}
                        </Button>
                      </div>
                    )}
                    {canProceedFromScrape && (
                      <Button
                        onClick={() => setCurrentStep(3)}
                        className="w-full bg-primary text-primary-foreground hover:bg-secondary"
                      >
                        Proceed to Classify
                      </Button>
                    )}
                  </>
                )}
                {scrapeStatus && (
                  <div className={`p-4 border rounded ${getNoticeClasses(scrapeStatus)}`}>
                    {scrapeStatus}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Classify */}
          {currentStep === 3 && (
            <Card className="max-w-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="text-primary" size={24} />
                  Review Classification
                </CardTitle>
                <CardDescription>
                  Classify reviews using sentiment analysis and zero-shot classification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>App ID</Label>
                  <Input
                    value={appId}
                    onChange={(e) => setAppId(DOMPurify.sanitize(e.target.value))}
                    className="bg-input border-border"
                    disabled={isClassifying}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Newly scraped reviews that have not been classified yet will be processed. Previously classified
                  reviews are skipped.
                </p>
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="custom-threshold">Use Custom Threshold</Label>
                      <p className="text-sm text-muted-foreground">Higher threshold = more strict (default: 0.5)</p>
                    </div>
                    <Switch id="custom-threshold" checked={useCustomThreshold} onCheckedChange={setUseCustomThreshold} />
                  </div>
                  {useCustomThreshold && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <Label>Threshold: {threshold[0].toFixed(2)}</Label>
                        <span className="text-sm text-muted-foreground">
                          {threshold[0] < 0.2 ? 'Very Loose' : threshold[0] < 0.4 ? 'Moderate' : threshold[0] < 0.6 ? 'Strict' : 'Very Strict'}
                        </span>
                      </div>
                      <Slider value={threshold} onValueChange={setThreshold} min={0} max={1} step={0.01} className="w-full" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0.0 (Loose)</span>
                        <span>0.5</span>
                        <span>1.0 (Strict)</span>
                      </div>
                    </div>
                  )}
                </div>
                {classifyRemaining === null ? (
                  <Button
                    onClick={handleClassifyReviews}
                    disabled={isClassifying || !appId.trim()}
                    className="w-full bg-primary text-primary-foreground hover:bg-secondary"
                  >
                    {isClassifying ? 'Classifying...' : 'Classify Reviews (batch of 10)'}
                  </Button>
                ) : classifyRemaining > 0 ? (
                  <div className="flex gap-3">
                    <Button
                      onClick={handleClassifyReviews}
                      disabled={isClassifying || !appId.trim()}
                      className="flex-1 bg-primary text-primary-foreground hover:bg-secondary"
                    >
                      {isClassifying ? 'Classifying...' : `Classify more (${classifyRemaining} left)`}
                    </Button>
                    <Button
                      onClick={() => setCurrentStep(4)}
                      variant="outline"
                      className="flex-1"
                      disabled={isClassifying}
                    >
                      Proceed to test cases
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setCurrentStep(4)}
                    className="w-full bg-primary text-primary-foreground hover:bg-secondary"
                  >
                    All classified — proceed to test cases
                  </Button>
                )}
                {classificationStatus && (
                  <div className={`p-4 border rounded ${getNoticeClasses(classificationStatus)}`}>
                    {classificationStatus}
                    {isClassifying && (
                      <p className="text-sm text-muted-foreground mt-2">
                        To see live progress, open <code className="bg-muted px-1 rounded">backend/classification_log.txt</code> (updates every 10 reviews).
                      </p>
                    )}
                  </div>
                )}
                {classificationStats && (
                  <div className="p-4 border rounded bg-muted/50">
                    <h4 className="font-semibold mb-2">Classification Statistics</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Total Classified: <strong>{classificationStats.total_classified || 0}</strong></div>
                      {classifyRunningTotal > 0 && <div>Classified this session: <strong>{classifyRunningTotal}</strong></div>}
                      {classificationStats.processed !== undefined && <div>Last batch: <strong>{classificationStats.processed}</strong></div>}
                      {classifyRemaining !== null && <div>Remaining: <strong>{classifyRemaining}</strong></div>}
                      {classificationStats.skipped !== undefined && <div>Skipped: <strong>{classificationStats.skipped}</strong></div>}
                      {classificationStats.errors !== undefined && <div>Errors: <strong>{classificationStats.errors}</strong></div>}
                      {classificationStats.threshold_used !== undefined && (
                        <div>
                          Threshold used:{' '}
                          <strong>
                            {typeof classificationStats.threshold_used === 'number'
                              ? classificationStats.threshold_used.toFixed(2)
                              : classificationStats.threshold_used}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4: Test cases */}
          {currentStep === 4 && (
            <Card className="max-w-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="text-primary" size={24} />
                  Test Case Generation
                </CardTitle>
                <CardDescription>
                  Generate test cases in Given-When-Then format from classified reviews
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>App ID</Label>
                  <Input value={appId} onChange={(e) => setAppId(DOMPurify.sanitize(e.target.value))} className="bg-input border-border" disabled={isGeneratingTestCases} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batchSize">Batch Size</Label>
                  <Input
                    id="batchSize"
                    type="number"
                    min={1}
                    max={50}
                    value={batchSize}
                    onChange={(e) => setBatchSize(parseInt(e.target.value) || 10)}
                    className="bg-input border-border"
                    disabled={isGeneratingTestCases}
                  />
                  <p className="text-sm text-muted-foreground">Number of reviews to process at once (1-50)</p>
                </div>
                <Button
                  onClick={handleGenerateTestCases}
                  disabled={isGeneratingTestCases || !appId.trim()}
                  className="w-full bg-primary text-primary-foreground hover:bg-secondary"
                >
                  {isGeneratingTestCases ? 'Generating...' : 'Generate Test Cases'}
                </Button>
                {testCaseStatus && (
                  <div className={`p-4 border rounded ${getNoticeClasses(testCaseStatus)}`}>
                    {testCaseStatus}
                  </div>
                )}
                {testCaseStats && (
                  <div className="p-4 border rounded bg-muted/50">
                    <h4 className="font-semibold mb-2">Test Case Statistics</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Total Test Cases: <strong>{testCaseStats.total_test_cases || 0}</strong></div>
                      <div>Coverage: <strong>{testCaseStats.coverage_percentage || 0}%</strong></div>
                      {testCaseStats.processed !== undefined && <div>Processed: <strong>{testCaseStats.processed}</strong></div>}
                      {testCaseStats.failed !== undefined && <div>Failed: <strong>{testCaseStats.failed}</strong></div>}
                    </div>
                  </div>
                )}
                <Button onClick={() => setCurrentStep(5)} className="w-full" variant="outline">
                  Next: Settings & APK
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Settings & APK */}
          {currentStep === 5 && (
            <div className="grid gap-6 max-w-2xl">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="text-primary" size={24} />
                    Settings
                  </CardTitle>
                  <CardDescription>
                    Configure classification and test case generation settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Default Threshold: 0.5</Label>
                    <p className="text-sm text-muted-foreground">
                      Override in the Classify step. 0.4–0.6 is recommended.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Threshold Guide</Label>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li><strong>0.0 - 0.2:</strong> Very loose</li>
                      <li><strong>0.2 - 0.4:</strong> Moderate</li>
                      <li><strong>0.4 - 0.6:</strong> Strict (default 0.5)</li>
                      <li><strong>0.6 - 1.0:</strong> Very strict</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UploadCloud className="text-primary" size={24} />
                    Upload APK
                  </CardTitle>
                  <CardDescription>
                    APK upload is required for Appium testing.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    className={`p-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all ${
                      isDragActive ? 'border-primary bg-primary/5' : 'border-border/60 bg-card/60'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
                    onDragEnter={(e) => { e.preventDefault(); setIsDragActive(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDragActive(false); }}
                    onDrop={(e) => { e.preventDefault(); setIsDragActive(false); handleFileSelection(e.dataTransfer.files?.[0] ?? null); }}
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
                  >
                    <UploadCloud className="text-muted-foreground" size={48} />
                    <p className="mt-4 font-semibold">Upload APK</p>
                    <p className="mt-2 text-sm text-muted-foreground">Drag and drop or click to select</p>
                    {isUploading && selectedApk && (
                      <div className="mt-4 flex items-center gap-2 text-sm text-primary">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Uploading {selectedApk.name}...
                      </div>
                    )}
                    {!isUploading && selectedApk && <p className="mt-4 text-sm text-primary">Ready: {selectedApk.name}</p>}
                    <input
                      type="file"
                      accept=".apk"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={(e) => handleFileSelection(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  {apkStatus && (
                    <div className={`mt-4 p-4 border rounded ${getNoticeClasses(apkStatus)}`}>
                      {apkStatus}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Navigation className="text-primary" size={24} />
                    Start navigating
                  </CardTitle>
                  <CardDescription>
                    Run the Appium UI crawler to build the navigation graph. With emulator on, you can watch the crawler in the emulator window.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label className="text-base">Start emulator</Label>
                      <p className="text-sm text-muted-foreground">
                        Launch an Android emulator so you can see where the crawler is visiting in real time.
                      </p>
                    </div>
                    <Switch
                      checked={startEmulatorWithNavigation}
                      onCheckedChange={setStartEmulatorWithNavigation}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Ensure Appium server is running on port 4723. You need Android Studio and at least one AVD (ANDROID_HOME set).
                  </p>
                  <Button
                    onClick={handleStartNavigation}
                    disabled={isStartingNavigation}
                    className="w-full sm:w-auto"
                  >
                    {isStartingNavigation ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2 inline-block" />
                        Starting…
                      </>
                    ) : (
                      'Start navigating'
                    )}
                  </Button>
                  {navigationStatus && (
                    <div className={`mt-4 p-4 border rounded ${getNoticeClasses(navigationStatus)}`}>
                      {navigationStatus}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
