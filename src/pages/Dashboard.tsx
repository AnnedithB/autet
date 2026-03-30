import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Sparkles, Database, Zap, UploadCloud, Brain, TestTube, Settings, Check, ChevronRight, Navigation, Layers } from 'lucide-react';
import DOMPurify from "dompurify";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

const STEPS = [
  { id: 1, label: 'App ID' },
  { id: 2, label: 'Scrape' },
  { id: 3, label: 'Classify' },
  { id: 4, label: 'Navigation' },
  { id: 5, label: 'Test Cases' },
  { id: 6, label: 'Enriched tests' },
];

const Dashboard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [appId, setAppId] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState('');
  const [scrapeCount, setScrapeCount] = useState(0);
  const [scrapeProgressStatus, setScrapeProgressStatus] = useState<'idle' | 'running' | 'paused' | 'stopping' | 'cleaning' | 'ready' | 'completed'>('idle');
  const [scrapeFromStart, setScrapeFromStart] = useState(false); // false = resume from checkpoint, true = start from beginning
  const [isStopping, setIsStopping] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isStartingNavigation, setIsStartingNavigation] = useState(false);
  const [navigationStatus, setNavigationStatus] = useState('');
  const [startEmulatorWithNavigation, setStartEmulatorWithNavigation] = useState(true);
  const [isStartingCrawler, setIsStartingCrawler] = useState(false);
  const [crawlerStatus, setCrawlerStatus] = useState('');
  const [isUploadingCreds, setIsUploadingCreds] = useState(false);
  const [testCredStatus, setTestCredStatus] = useState('');
  const testCredInputRef = useRef<HTMLInputElement>(null);

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
  const [testCaseRemaining, setTestCaseRemaining] = useState<number | null>(null);
  const [testCaseRunningTotal, setTestCaseRunningTotal] = useState(0);
  const [displayCount, setDisplayCount] = useState(0);
  const displayCountRef = useRef(0);

  const [navGraphReady, setNavGraphReady] = useState<boolean | null>(null);
  const [enrichedItems, setEnrichedItems] = useState<any[]>([]);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichStatus, setEnrichStatus] = useState('');
  const [enrichSummary, setEnrichSummary] = useState<any>(null);
  const [enrichLimit, setEnrichLimit] = useState<number | ''>('');
  const [editingEnrichedId, setEditingEnrichedId] = useState<string | null>(null);
  const [editTestInputsJson, setEditTestInputsJson] = useState('');
  const [editExpandedJson, setEditExpandedJson] = useState('');
  const [saveEnrichedStatus, setSaveEnrichedStatus] = useState('');

  useEffect(() => {
    return () => {
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

  const handleStartNavigation = async () => {
    setIsStartingNavigation(true);
    setNavigationStatus('');
    setCrawlerStatus('');
    try {
      let url = `${API_BASE}/api/appium/start-navigation?startEmulator=${startEmulatorWithNavigation}`;
      if (appId.trim()) url += `&appId=${encodeURIComponent(appId.trim())}`;
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

  const handleStartCrawler = async () => {
    if (!appId.trim()) {
      setCrawlerStatus('Please enter an App ID (Android package name) first.');
      return;
    }
    setIsStartingCrawler(true);
    setCrawlerStatus('Starting crawler for app...');
    try {
      let url = `${API_BASE}/api/appium/start-crawler?appId=${encodeURIComponent(appId.trim())}`;
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (res.status === 202 || data.status === 'started')) {
        setCrawlerStatus(data.message || 'Crawler started. Watch the emulator and backend/appium_navigation_log.txt.');
      } else {
        setCrawlerStatus(data.error || `Error: ${res.status}`);
      }
    } catch (err) {
      setCrawlerStatus(`Network error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsStartingCrawler(false);
    }
  };

  const handleTestCredSelection = async (file: File | null) => {
    if (!file) {
      setTestCredStatus('');
      setIsUploadingCreds(false);
      return;
    }
    if (!file.name.toLowerCase().endsWith('.txt')) {
      setTestCredStatus('Only .txt files are supported');
      setIsUploadingCreds(false);
      return;
    }
    setIsUploadingCreds(true);
    setTestCredStatus('Uploading test credentials...');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/api/appium/upload-creds`, { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setTestCredStatus('Test credentials uploaded. They will be used to fill login forms automatically.');
      } else {
        setTestCredStatus(`Upload failed: ${data.error || res.statusText}`);
      }
    } catch (err) {
      setTestCredStatus(`Upload error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsUploadingCreds(false);
      if (testCredInputRef.current) testCredInputRef.current.value = '';
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
    setTestCaseStatus(`Generating test cases (batch of ${batchSize})...`);
    
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
        const batchProcessed = data.processed ?? 0;
        setTestCaseRunningTotal(prev => prev + batchProcessed);
        const remaining = data.remaining ?? 0;
        setTestCaseRemaining(remaining);
        if (remaining > 0) {
          setTestCaseStatus(`Generated ${batchProcessed} test cases. ${remaining} remaining.`);
        } else {
          setTestCaseStatus(`Complete! All classified reviews have test cases.`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestCaseStatus(`Network error: ${msg}`);
    } finally {
      setIsGeneratingTestCases(false);
    }
  };

  const fetchNavigationGraphMeta = useCallback(async () => {
    if (!appId.trim()) return;
    try {
      const r = await fetch(
        `${API_BASE}/api/appium/navigation-graph?appId=${encodeURIComponent(appId)}`
      );
      setNavGraphReady(r.ok);
    } catch {
      setNavGraphReady(false);
    }
  }, [appId]);

  const fetchEnrichedList = useCallback(async () => {
    if (!appId.trim()) return;
    try {
      const r = await fetch(
        `${API_BASE}/api/enriched-tests/list?appId=${encodeURIComponent(appId)}`
      );
      if (r.ok) {
        const d = await r.json();
        setEnrichedItems(d.items || []);
      }
    } catch {
      // ignore
    }
  }, [appId]);

  const handleRunEnrichment = async () => {
    if (!appId.trim()) {
      setEnrichStatus('Please enter an App ID');
      return;
    }
    setIsEnriching(true);
    setEnrichStatus('Running navigation + GWT model (may take a while per test case)...');
    setEnrichSummary(null);
    try {
      let url = `${API_BASE}/api/enriched-tests/enrich?appId=${encodeURIComponent(appId)}`;
      if (enrichLimit !== '' && Number(enrichLimit) > 0) {
        url += `&limit=${encodeURIComponent(String(enrichLimit))}`;
      }
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEnrichStatus(data.error || data.detail || res.statusText || 'Enrichment failed');
        return;
      }
      setEnrichSummary(data);
      setEnrichStatus(
        `Done: processed ${data.processed ?? 0} of ${data.total_candidates ?? 0}. Failed: ${data.failed ?? 0}.`
      );
      await fetchEnrichedList();
    } catch (err) {
      setEnrichStatus(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsEnriching(false);
    }
  };

  const startEditEnriched = (item: any) => {
    setEditingEnrichedId(item.id);
    setEditTestInputsJson(JSON.stringify(item.test_inputs_by_screen || {}, null, 2));
    setEditExpandedJson(JSON.stringify(item.expanded_test_cases || [], null, 2));
    setSaveEnrichedStatus('');
  };

  const cancelEditEnriched = () => {
    setEditingEnrichedId(null);
    setEditTestInputsJson('');
    setEditExpandedJson('');
    setSaveEnrichedStatus('');
  };

  const saveEditEnriched = async () => {
    if (!editingEnrichedId) return;
    let tin: unknown;
    let exp: unknown;
    try {
      tin = JSON.parse(editTestInputsJson);
      exp = JSON.parse(editExpandedJson);
    } catch {
      setSaveEnrichedStatus('Invalid JSON — check syntax.');
      return;
    }
    try {
      const r = await fetch(`${API_BASE}/api/enriched-tests/${editingEnrichedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_inputs_by_screen: tin,
          expanded_test_cases: exp,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setSaveEnrichedStatus(data.error || r.statusText || 'Save failed');
        return;
      }
      setSaveEnrichedStatus('Saved.');
      cancelEditEnriched();
      await fetchEnrichedList();
    } catch (err) {
      setSaveEnrichedStatus(err instanceof Error ? err.message : 'Network error');
    }
  };

  useEffect(() => {
    if (currentStep !== 6 || !appId.trim()) return;
    fetchNavigationGraphMeta();
    fetchEnrichedList();
  }, [currentStep, appId, fetchNavigationGraphMeta, fetchEnrichedList]);

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

  // When entering Classify or Test Cases step, refresh stats so user sees counts
  useEffect(() => {
    if ((currentStep === 3 || currentStep === 5) && appId.trim()) {
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
                  Enter the Google Play Store App ID (package name) and the email to receive step completion notifications.
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
                <div className="space-y-2">
                  <Label htmlFor="recipientEmail">Notification email</Label>
                  <Input
                    id="recipientEmail"
                    type="email"
                    placeholder="you@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(DOMPurify.sanitize(e.target.value))}
                    className="bg-input border-border"
                  />
                  <p className="text-xs text-muted-foreground">
                    We will email you when each step completes.
                  </p>
                </div>
                <Button
                  onClick={async () => {
                    setEmailStatus('');
                    if (appId.trim() && recipientEmail.trim()) {
                      try {
                        const res = await fetch(
                          `${API_BASE}/api/notifications/recipient?appId=${encodeURIComponent(appId.trim())}&email=${encodeURIComponent(recipientEmail.trim())}`,
                          { method: 'POST' }
                        );
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) {
                          setEmailStatus(data.error || `Failed to save email (${res.status})`);
                        }
                      } catch (err) {
                        setEmailStatus(`Network error saving email: ${err instanceof Error ? err.message : String(err)}`);
                      }
                    }
                    setCurrentStep(2);
                  }}
                  disabled={!appId.trim()}
                  className="w-full bg-primary text-primary-foreground hover:bg-secondary"
                >
                  Next: Scrape reviews
                </Button>
                {emailStatus && (
                  <div className={`p-3 border rounded ${getNoticeClasses(emailStatus)}`}>
                    {emailStatus}
                  </div>
                )}
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
                      Proceed to navigation
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setCurrentStep(4)}
                    className="w-full bg-primary text-primary-foreground hover:bg-secondary"
                  >
                    All classified — proceed to navigation
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

          {/* Step 4: Navigation */} 
          {currentStep === 4 && (
            <div className="grid gap-6 max-w-2xl">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UploadCloud className="text-primary" size={24} />
                    Test credentials
                  </CardTitle>
                  <CardDescription>
                    Upload a simple <code>.txt</code> file with screen names and inputs (see sampleTestCred.txt in the appium folder).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Example:
                    <br />
                    <code className="text-xs">
                      Login Screen
                      <br />
                      Email = user@example.com
                      <br />
                      Password = secret123
                    </code>
                  </p>
                  <div className="flex items-center gap-3">
                    <Input
                      type="file"
                      accept=".txt"
                      ref={testCredInputRef}
                      className="bg-input border-border"
                      onChange={(e) => handleTestCredSelection(e.target.files?.[0] ?? null)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isUploadingCreds}
                      onClick={() => testCredInputRef.current?.click()}
                    >
                      {isUploadingCreds ? 'Uploading…' : 'Choose file'}
                    </Button>
                  </div>
                  {testCredStatus && (
                    <div className={`mt-2 p-3 border rounded ${getNoticeClasses(testCredStatus)}`}>
                      {testCredStatus}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Navigation className="text-primary" size={24} />
                    Navigation (Appium)
                  </CardTitle>
                  <CardDescription>
                    1. Click <strong>Start navigating</strong> to launch the emulator and Appium server.
                    2. When the emulator is open, drag and drop your Daraz APK/APKM from your Downloads folder onto the emulator window and complete the install dialog.
                    3. After install, click <strong>Start crawler</strong> to attach to the app and build the navigation graph.
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
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={handleStartNavigation}
                      disabled={isStartingNavigation}
                      className="flex-1 sm:flex-none"
                    >
                      {isStartingNavigation ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2 inline-block" />
                          Starting emulator…
                        </>
                      ) : (
                        'Start navigating'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleStartCrawler}
                      disabled={isStartingCrawler}
                      className="flex-1 sm:flex-none"
                    >
                      {isStartingCrawler ? 'Starting crawler…' : 'Start crawler'}
                    </Button>
                  </div>
                  {navigationStatus && (
                    <div className={`mt-4 p-4 border rounded ${getNoticeClasses(navigationStatus)}`}>
                      {navigationStatus}
                    </div>
                  )}
                  {crawlerStatus && (
                    <div className={`mt-2 p-4 border rounded ${getNoticeClasses(crawlerStatus)}`}>
                      {crawlerStatus}
                    </div>
                  )}

                  <Button
                    onClick={() => setCurrentStep(5)}
                    variant="outline"
                    className="w-full"
                  >
                    Next: Generate test cases
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 5: Test cases */}
          {currentStep === 5 && (
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
                <p className="text-sm text-muted-foreground">
                  Classified reviews without test cases will be processed. Already-generated test cases are skipped.
                </p>
                <div className="space-y-2 p-4 border rounded-lg">
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
                  <p className="text-sm text-muted-foreground">Number of reviews to process per batch (1-50)</p>
                </div>
                <Button
                  onClick={handleGenerateTestCases}
                  disabled={isGeneratingTestCases || !appId.trim()}
                  className="w-full bg-primary text-primary-foreground hover:bg-secondary"
                >
                  {isGeneratingTestCases ? 'Generating...' : `Generate Test Cases (batch of ${batchSize})`}
                </Button>
                {testCaseStatus && (
                  <div className={`p-4 border rounded ${getNoticeClasses(testCaseStatus)}`}>
                    {testCaseStatus}
                    {isGeneratingTestCases && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Test case generation uses the Qwen model on CPU — each batch may take a minute or two.
                      </p>
                    )}
                  </div>
                )}
                {testCaseStats && (
                  <div className="p-4 border rounded bg-muted/50">
                    <h4 className="font-semibold mb-2">Test Case Statistics</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Total Test Cases: <strong>{testCaseStats.total_test_cases || 0}</strong></div>
                      <div>Coverage: <strong>{testCaseStats.coverage_percentage || 0}%</strong></div>
                      <div>Total Classified: <strong>{testCaseStats.classified_total || classificationStats?.total_classified || 0}</strong></div>
                      {testCaseRunningTotal > 0 && <div>Generated this session: <strong>{testCaseRunningTotal}</strong></div>}
                      {testCaseStats.processed !== undefined && <div>Last batch: <strong>{testCaseStats.processed}</strong></div>}
                      {testCaseRemaining !== null && <div>Remaining: <strong>{testCaseRemaining}</strong></div>}
                      {testCaseStats.failed !== undefined && testCaseStats.failed > 0 && <div>Failed: <strong>{testCaseStats.failed}</strong></div>}
                    </div>
                  </div>
                )}
                <Button
                  onClick={() => setCurrentStep(6)}
                  variant="outline"
                  className="w-full"
                  disabled={!appId.trim()}
                >
                  Next: Enriched tests (inputs + scenarios)
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 6: Enriched test outputs (navigation LoRA) */}
          {currentStep === 6 && (
            <Card className="max-w-4xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="text-primary" size={24} />
                  Enriched tests
                </CardTitle>
                <CardDescription>
                  Uses the crawler navigation JSON plus your Given–When–Then test cases to propose field-level test
                  data and expanded scenarios. Requires a finished crawl and the Colab LoRA in{' '}
                  <code className="text-xs">backend/models/lora_mobile_testgen</code>.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>App ID</Label>
                  <Input
                    value={appId}
                    onChange={(e) => setAppId(DOMPurify.sanitize(e.target.value))}
                    className="bg-input border-border"
                    disabled={isEnriching}
                  />
                </div>
                <div className="p-4 border rounded-lg text-sm space-y-2">
                  <div>
                    <span className="font-medium">Navigation graph file: </span>
                    {navGraphReady === null && <span className="text-muted-foreground">Checking…</span>}
                    {navGraphReady === true && (
                      <span className="text-primary">Found (crawler export ready)</span>
                    )}
                    {navGraphReady === false && (
                      <span className="text-destructive">
                        Missing — run the crawler in step 4 for this app first.
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="font-medium">Enriched rows saved: </span>
                    {enrichedItems.length}
                  </div>
                </div>
                <div className="space-y-2 p-4 border rounded-lg">
                  <Label>Optional: max test cases to process</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Leave empty for all"
                    value={enrichLimit === '' ? '' : enrichLimit}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEnrichLimit(v === '' ? '' : parseInt(v, 10) || '');
                    }}
                    className="bg-input border-border"
                    disabled={isEnriching}
                  />
                </div>
                <Button
                  onClick={handleRunEnrichment}
                  disabled={isEnriching || !appId.trim() || navGraphReady !== true}
                  className="w-full bg-primary text-primary-foreground hover:bg-secondary"
                >
                  {isEnriching ? 'Enriching…' : 'Run enrichment'}
                </Button>
                {enrichStatus && (
                  <div className={`p-4 border rounded ${getNoticeClasses(enrichStatus)}`}>{enrichStatus}</div>
                )}
                {enrichSummary?.errors?.length > 0 && (
                  <div className="p-4 border rounded bg-muted/50 text-sm max-h-48 overflow-auto">
                    <p className="font-medium mb-2">Errors (first rows)</p>
                    <ul className="list-disc pl-5 space-y-1">
                      {enrichSummary.errors.slice(0, 8).map((e: any, i: number) => (
                        <li key={i}>
                          {e.test_case_id}: {e.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="font-semibold">Results</h4>
                  {enrichedItems.length === 0 && (
                    <p className="text-sm text-muted-foreground">No enriched rows yet. Run enrichment after step 5.</p>
                  )}
                  {enrichedItems.map((item) => (
                    <Card key={item.id} className="border-border">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm font-medium">
                          GWT: {item.given?.slice(0, 80)}
                          {item.given?.length > 80 ? '…' : ''}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          When: {item.when?.slice(0, 120)}
                          {item.when?.length > 120 ? '…' : ''}
                        </p>
                        {item.user_edited && (
                          <span className="text-xs text-primary">Edited manually</span>
                        )}
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-3">
                        {editingEnrichedId === item.id ? (
                          <>
                            <div className="space-y-1">
                              <Label className="text-xs">test_inputs_by_screen (JSON object)</Label>
                              <Textarea
                                value={editTestInputsJson}
                                onChange={(e) => setEditTestInputsJson(e.target.value)}
                                className="font-mono text-xs min-h-[120px] bg-input"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">expanded_test_cases (JSON array)</Label>
                              <Textarea
                                value={editExpandedJson}
                                onChange={(e) => setEditExpandedJson(e.target.value)}
                                className="font-mono text-xs min-h-[160px] bg-input"
                              />
                            </div>
                            {saveEnrichedStatus && (
                              <p className="text-sm text-muted-foreground">{saveEnrichedStatus}</p>
                            )}
                            <div className="flex gap-2">
                              <Button size="sm" onClick={saveEditEnriched}>
                                Save changes
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEditEnriched}>
                                Cancel
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <pre className="text-xs bg-muted/50 p-3 rounded overflow-auto max-h-40 whitespace-pre-wrap">
                              {JSON.stringify(item.test_inputs_by_screen || {}, null, 2)}
                            </pre>
                            <pre className="text-xs bg-muted/50 p-3 rounded overflow-auto max-h-48 whitespace-pre-wrap">
                              {JSON.stringify(item.expanded_test_cases || [], null, 2)}
                            </pre>
                            <Button size="sm" variant="outline" onClick={() => startEditEnriched(item)}>
                              Edit JSON
                            </Button>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
