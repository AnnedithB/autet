import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Sparkles, Database, Zap, UploadCloud, Brain, TestTube, Settings, Check, ChevronLeft, ChevronRight, Navigation, Layers, Clapperboard } from 'lucide-react';
import DOMPurify from "dompurify";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

const REVIEWS_PANEL_LIMIT = 1500;
const CLASSIFIED_PANEL_LIMIT = 1200;
const TESTCASE_PANEL_LIMIT = 1200;

function reviewPanelDisplayText(r: any): string {
  const title = typeof r?.title === 'string' ? r.title.trim() : '';
  const text = typeof r?.text === 'string' ? r.text.trim() : '';
  if (title || text) return `${title} ${text}`.trim();
  return String(r?.cleaned || r?.original || '').trim();
}

function reviewPanelRowsLikelySame(a: any, b: any): boolean {
  const da = reviewPanelDisplayText(a);
  const db = reviewPanelDisplayText(b);
  if (da.length >= 20 && db.length >= 20 && da === db) return true;
  if (a?.id != null && b?.id != null && String(a.id) === String(b.id)) return true;
  return false;
}

const STEPS = [
  { id: 1, label: 'App ID', short: 'App' },
  { id: 2, label: 'Scrape', short: 'Scrape' },
  { id: 3, label: 'Classify', short: 'Classify' },
  { id: 4, label: 'Navigation', short: 'Nav' },
  { id: 5, label: 'Crawler output', short: 'Crawl' },
  { id: 6, label: 'Test Cases', short: 'Tests' },
  { id: 7, label: 'Enriched tests', short: 'Enrich' },
  { id: 8, label: 'Select flow', short: 'Flow' },
  { id: 9, label: 'Run flow', short: 'Run' },
  { id: 10, label: 'Results', short: 'Results' },
] as const;

const Dashboard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const stepperScrollRef = useRef<HTMLDivElement | null>(null);
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
  const demoStreamRef = useRef<EventSource | null>(null);
  const [demoStreamStatus, setDemoStreamStatus] = useState<'idle' | 'running' | 'error' | 'done'>('idle');
  const [demoStreamError, setDemoStreamError] = useState('');
  const [demoTotal, setDemoTotal] = useState<number | null>(null);
  const [demoSent, setDemoSent] = useState(0);
  const [demoImported, setDemoImported] = useState(0);
  const [liveReviews, setLiveReviews] = useState<any[]>([]);
  const liveReviewsBoxRef = useRef<HTMLDivElement | null>(null);
  const [isAutoScrollLocked, setIsAutoScrollLocked] = useState(true);
  const [isStartingNavigation, setIsStartingNavigation] = useState(false);
  const [navigationStatus, setNavigationStatus] = useState('');
  const [startEmulatorWithNavigation, setStartEmulatorWithNavigation] = useState(true);
  const [isStartingCrawler, setIsStartingCrawler] = useState(false);
  const [crawlerStatus, setCrawlerStatus] = useState('');
  const [isUploadingCreds, setIsUploadingCreds] = useState(false);
  const [testCredStatus, setTestCredStatus] = useState('');
  const testCredInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingApk, setIsUploadingApk] = useState(false);
  const [apkStatus, setApkStatus] = useState('');
  const apkInputRef = useRef<HTMLInputElement>(null);

  const [crawlerGraph, setCrawlerGraph] = useState<any>(null);
  const [crawlerGraphStatus, setCrawlerGraphStatus] = useState('');
  const [crawlerScreens, setCrawlerScreens] = useState<Array<{ name: string; url: string }>>([]);
  const [crawlerScreenIdx, setCrawlerScreenIdx] = useState(0);

  const [useCustomThreshold, setUseCustomThreshold] = useState(false);
  const [threshold, setThreshold] = useState([0.5]);
  const [isClassifying, setIsClassifying] = useState(false);
  const [classificationStatus, setClassificationStatus] = useState('');
  const [classificationStats, setClassificationStats] = useState<any>(null);
  const [classifyRemaining, setClassifyRemaining] = useState<number | null>(null);
  const [classifyRunningTotal, setClassifyRunningTotal] = useState(0);
  const [liveClassified, setLiveClassified] = useState<any[]>([]);
  const classifiedBoxRef = useRef<HTMLDivElement | null>(null);
  const [classifiedAutoScroll, setClassifiedAutoScroll] = useState(true);

  const [isGeneratingTestCases, setIsGeneratingTestCases] = useState(false);
  const [testCaseStatus, setTestCaseStatus] = useState('');
  const [testCaseStats, setTestCaseStats] = useState<any>(null);
  const [batchSize, setBatchSize] = useState(10);
  const [testCaseRemaining, setTestCaseRemaining] = useState<number | null>(null);
  const [testCaseRunningTotal, setTestCaseRunningTotal] = useState(0);
  const [displayCount, setDisplayCount] = useState(0);
  const displayCountRef = useRef(0);
  const [liveTestCases, setLiveTestCases] = useState<any[]>([]);
  const testCasesBoxRef = useRef<HTMLDivElement | null>(null);
  const [testCasesAutoScroll, setTestCasesAutoScroll] = useState(true);
  const [nextTcIdx, setNextTcIdx] = useState(0);
  const [currentShownTc, setCurrentShownTc] = useState<any | null>(null);

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

  // Step 8/9: user-selected flow runner
  const [flowStartUid, setFlowStartUid] = useState('');
  const [flowEndUid, setFlowEndUid] = useState('');
  const [flowPathsStatus, setFlowPathsStatus] = useState('');
  const [flowPathsTruncated, setFlowPathsTruncated] = useState(false);
  const [flowPaths, setFlowPaths] = useState<Array<{ nodes: string[]; actions: string[] }>>([]);
  const [selectedFlowPathIdx, setSelectedFlowPathIdx] = useState<number | null>(null);
  const [testCredsParsed, setTestCredsParsed] = useState<Record<string, Record<string, string>>>({});
  const [graphInputsGenerated, setGraphInputsGenerated] = useState<{
    items_by_uid?: Record<string, Record<string, string>>;
    items_by_label?: Record<string, Record<string, string>>;
  } | null>(null);
  const [inputsByScreen, setInputsByScreen] = useState<Record<string, Record<string, string>>>({});
  const [filterSteps, setFilterSteps] = useState<Array<{ screenUid: string; buttonLabel: string; valueToSelect: string }>>([]);

  const [isRunningFlow, setIsRunningFlow] = useState(false);
  const [runFlowStatus, setRunFlowStatus] = useState('');
  const [runFlowPid, setRunFlowPid] = useState<number | null>(null);
  const [runFlowLog, setRunFlowLog] = useState('');
  const [lastRunFlowRequestId, setLastRunFlowRequestId] = useState<string | null>(null);
  const [userflowVideoItems, setUserflowVideoItems] = useState<Array<{ name: string; url: string }>>([]);
  const [userflowResult, setUserflowResult] = useState<any | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (demoStreamRef.current) {
        try { demoStreamRef.current.close(); } catch { /* ignore */ }
        demoStreamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isAutoScrollLocked) return;
    const el = liveReviewsBoxRef.current;
    if (!el) return;
    // After a new review renders, stick to bottom (if user hasn't scrolled up).
    requestAnimationFrame(() => {
      try {
        el.scrollTop = el.scrollHeight;
      } catch {
        // ignore
      }
    });
  }, [liveReviews, isAutoScrollLocked]);

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
    setIsStartingCrawler(true);
    setCrawlerStatus(appId.trim() ? 'Starting crawler for app...' : 'Starting crawler for currently open app...');
    try {
      let url = `${API_BASE}/api/appium/start-crawler`;
      if (appId.trim()) {
        url += `?appId=${encodeURIComponent(appId.trim())}`;
      }
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

  const handleStopCrawler = async () => {
    setCrawlerStatus('Stopping crawler and saving graph…');
    try {
      const res = await fetch(`${API_BASE}/api/appium/stop-crawler`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCrawlerStatus(data.error || `Failed to stop crawler (${res.status})`);
        return;
      }
      setCrawlerStatus(data.message || 'Stop requested. Graph will be exported shortly.');
    } catch (err) {
      setCrawlerStatus(`Network error: ${err instanceof Error ? err.message : String(err)}`);
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

  const handleApkSelection = async (file: File | null) => {
    if (!file) {
      setApkStatus('');
      setIsUploadingApk(false);
      return;
    }
    if (!file.name.toLowerCase().endsWith('.apk')) {
      setApkStatus('Only .apk files are supported');
      setIsUploadingApk(false);
      return;
    }
    setIsUploadingApk(true);
    setApkStatus('Uploading APK...');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/api/appium/upload-apk`, { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setApkStatus(`APK uploaded: ${data.filename || file.name}. It will be used when the crawler starts.`);
      } else {
        setApkStatus(`Upload failed: ${data.error || res.statusText}`);
      }
    } catch (err) {
      setApkStatus(`Upload error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsUploadingApk(false);
      if (apkInputRef.current) apkInputRef.current.value = '';
    }
  };

  const fetchCleanedReviewsForPanel = useCallback(async () => {
    if (!appId.trim()) return;
    try {
      const r = await fetch(
        `${API_BASE}/api/reviews/cleaned?appId=${encodeURIComponent(appId.trim())}&limit=${REVIEWS_PANEL_LIMIT}`
      );
      if (!r.ok) return;
      const d = await r.json().catch(() => ({}));
      const items = Array.isArray(d.items) ? d.items : [];
      // Oldest first so new streamed items naturally append at the bottom.
      setLiveReviews([...items].reverse());
    } catch {
      // ignore
    }
  }, [appId]);

  useEffect(() => {
    if (currentStep !== 2 || !appId.trim()) return;
    void fetchCleanedReviewsForPanel();
  }, [currentStep, appId, fetchCleanedReviewsForPanel]);

  useEffect(() => {
    if (currentStep !== 2 || !appId.trim()) return;
    if (appId.trim() === 'com.edutech') return;
    const active = ['running', 'paused', 'stopping', 'cleaning'].includes(scrapeProgressStatus);
    if (!active) return;
    void fetchCleanedReviewsForPanel();
    const t = setInterval(() => void fetchCleanedReviewsForPanel(), 3000);
    return () => clearInterval(t);
  }, [currentStep, appId, scrapeProgressStatus, fetchCleanedReviewsForPanel]);

  const handleScrape = async () => {
    if (!appId.trim()) {
      setScrapeStatus('Please enter an App ID');
      return;
    }

    // Demo-mode: stream from revsedu/reviews.json for com.edutech
    if (appId.trim() === 'com.edutech') {
      const FIXED_DELAY_MS = 250;
      setScrapeStatus('');
      setDemoStreamError('');
      setDemoStreamStatus('running');
      setScrapeProgressStatus('running');
      setDemoSent(0);
      setDemoImported(0);
      setDemoTotal(null);
      setScrapeCount(0);
      try {
        if (demoStreamRef.current) {
          try { demoStreamRef.current.close(); } catch { /* ignore */ }
          demoStreamRef.current = null;
        }
        await fetchCleanedReviewsForPanel();
        const url = `${API_BASE || window.location.origin}/api/reviews/revsedu/stream?appId=${encodeURIComponent(appId.trim())}&delayMs=${encodeURIComponent(String(FIXED_DELAY_MS))}`;
        const es = new EventSource(url);
        demoStreamRef.current = es;

        es.onmessage = (evt) => {
          let payload: any = null;
          try {
            payload = JSON.parse(evt.data);
          } catch {
            return;
          }
          if (!payload || typeof payload !== 'object') return;

          if (payload.type === 'meta') {
            setDemoTotal(typeof payload.total === 'number' ? payload.total : null);
            return;
          }
          if (payload.type === 'review') {
            const review = payload.review;
            setDemoSent((prev) => {
              const next = Math.max(prev, typeof payload.i === 'number' ? payload.i : prev + 1);
              setScrapeCount(next);
              return next;
            });
            if (review) {
              setLiveReviews((prev) => {
                if (prev.some((p) => reviewPanelRowsLikelySame(p, review))) return prev;
                const next = [...prev, review];
                return next.length > REVIEWS_PANEL_LIMIT ? next.slice(next.length - REVIEWS_PANEL_LIMIT) : next;
              });
            }
            return;
          }
          if (payload.type === 'import') {
            if (typeof payload.imported === 'number') setDemoImported(payload.imported);
            return;
          }
          if (payload.type === 'done') {
            setDemoStreamStatus('done');
            setScrapeProgressStatus('ready');
            setScrapeStatus('Fetch complete. Ready to classify.');
            if (typeof payload.imported === 'number') setDemoImported(payload.imported);
            if (typeof payload.sent === 'number') setScrapeCount(payload.sent);
            try { es.close(); } catch { /* ignore */ }
            demoStreamRef.current = null;
            return;
          }
          if (payload.type === 'error') {
            const msg = payload.error ? String(payload.error) : 'Unknown error';
            setDemoStreamStatus('error');
            setDemoStreamError(msg);
            setScrapeProgressStatus('idle');
            setScrapeStatus(`Fetch error: ${msg}`);
            try { es.close(); } catch { /* ignore */ }
            demoStreamRef.current = null;
            return;
          }
        };

        es.onerror = () => {
          setDemoStreamStatus('error');
          setDemoStreamError('Connection lost');
          setScrapeProgressStatus('idle');
          setScrapeStatus('Fetch error: connection lost');
          try { es.close(); } catch { /* ignore */ }
          demoStreamRef.current = null;
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setDemoStreamStatus('error');
        setDemoStreamError(msg);
        setScrapeProgressStatus('idle');
        setScrapeStatus(`Fetch error: ${msg}`);
      }
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

  const fetchLatestClassified = useCallback(async () => {
    if (!appId.trim()) return;
    try {
      const r = await fetch(
        `${API_BASE}/api/classification/latest?appId=${encodeURIComponent(appId.trim())}&limit=${CLASSIFIED_PANEL_LIMIT}`
      );
      if (!r.ok) return;
      const d = await r.json();
      const items = Array.isArray(d.items) ? d.items : [];
      setLiveClassified(items);
    } catch {
      // ignore
    }
  }, [appId]);

  useEffect(() => {
    if (currentStep !== 3 || !appId.trim()) return;
    fetchLatestClassified();
    const t = setInterval(fetchLatestClassified, 1200);
    return () => clearInterval(t);
  }, [currentStep, appId, fetchLatestClassified]);

  useEffect(() => {
    if (!classifiedAutoScroll) return;
    const el = classifiedBoxRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      try {
        el.scrollTop = 0; // latest-first list
      } catch {
        // ignore
      }
    });
  }, [liveClassified, classifiedAutoScroll]);

  const startBackgroundTestGen = useCallback(async () => {
    if (!appId.trim()) return;
    try {
      await fetch(
        `${API_BASE}/api/test-cases/start-background?appId=${encodeURIComponent(appId)}&batch_size=${batchSize}`,
        { method: 'POST' }
      );
    } catch {
      // ignore
    }
  }, [appId, batchSize]);

  const handleGenerateTestCases = async () => {
    if (!appId.trim()) {
      setTestCaseStatus('Please enter an App ID');
      return;
    }

    // New behavior: show already-generated test cases one-by-one.
    setIsGeneratingTestCases(true);
    setTestCaseStatus('Loading generated test cases…');
    try {
      const r = await fetch(
        `${API_BASE}/api/test-cases/latest?appId=${encodeURIComponent(appId)}&limit=${TESTCASE_PANEL_LIMIT}`
      );
      const d = await r.json().catch(() => ({}));
      const items = Array.isArray(d.items) ? d.items : [];
      setLiveTestCases(items);

      if (items.length === 0) {
        // Kick off background generation if nothing exists yet.
        await startBackgroundTestGen();
        setTestCaseStatus('No test cases yet. Background generation started — wait a bit and click again.');
        setCurrentShownTc(null);
        setNextTcIdx(0);
        return;
      }

      const idx = Math.min(nextTcIdx, items.length - 1);
      const next = items[items.length - 1 - idx]; // show oldest-first from latest list
      setCurrentShownTc(next);
      setNextTcIdx((prev) => prev + 1);
      setTestCaseStatus(`Showing test case ${idx + 1} of ${items.length} (from generated list).`);
    } catch (err) {
      setTestCaseStatus(`Network error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGeneratingTestCases(false);
    }
  };

  const fetchLatestTestCases = useCallback(async () => {
    if (!appId.trim()) return;
    try {
      const r = await fetch(
        `${API_BASE}/api/test-cases/latest?appId=${encodeURIComponent(appId)}&limit=${TESTCASE_PANEL_LIMIT}`
      );
      if (!r.ok) return;
      const d = await r.json().catch(() => ({}));
      const items = Array.isArray(d.items) ? d.items : [];
      setLiveTestCases(items);
    } catch {
      // ignore
    }
  }, [appId]);

  useEffect(() => {
    if (currentStep !== 6 || !appId.trim()) return;
    fetchLatestTestCases();
    const t = setInterval(fetchLatestTestCases, 1200);
    return () => clearInterval(t);
  }, [currentStep, appId, fetchLatestTestCases]);

  // When entering Step 4 (Navigation), if classification is complete, start test case generation in background.
  useEffect(() => {
    if (currentStep !== 4) return;
    if (!appId.trim()) return;
    if (classifyRemaining !== 0) return;
    startBackgroundTestGen();
  }, [currentStep, appId, classifyRemaining, startBackgroundTestGen]);

  useEffect(() => {
    if (!testCasesAutoScroll) return;
    const el = testCasesBoxRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      try {
        el.scrollTop = 0; // latest-first list
      } catch {
        // ignore
      }
    });
  }, [liveTestCases, testCasesAutoScroll]);

  const fetchNavigationGraphMeta = useCallback(async () => {
    if (!appId.trim()) return;
    try {
      const r = await fetch(`${API_BASE}/api/appium/latest-graph`);
      setNavGraphReady(r.ok);
    } catch {
      setNavGraphReady(false);
    }
  }, [appId]);

  const fetchCrawlerOutput = useCallback(async () => {
    setCrawlerGraphStatus('Loading crawler output…');
    try {
      const [g, s] = await Promise.all([
        fetch(`${API_BASE}/api/appium/latest-graph`),
        fetch(`${API_BASE}/api/appium/screenshots`),
      ]);
      const graphData = await g.json().catch(() => null);
      const screensData = await s.json().catch(() => ({}));

      if (!g.ok) {
        setCrawlerGraph(null);
        setCrawlerGraphStatus(graphData?.error || `Failed to load graph (${g.status})`);
      } else {
        setCrawlerGraph(graphData);
        setCrawlerGraphStatus('Loaded.');
      }

      const items = Array.isArray(screensData?.items) ? screensData.items : [];
      setCrawlerScreens(items);
      setCrawlerScreenIdx(0);
    } catch (err) {
      setCrawlerGraph(null);
      setCrawlerScreens([]);
      setCrawlerGraphStatus(`Network error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  const crawlerSummary = useMemo(() => {
    const g = crawlerGraph;
    const nodes = Array.isArray(g?.nodes) ? g.nodes : [];
    const edges = Array.isArray(g?.edges) ? g.edges : [];

    const screens = nodes
      .map((n: any) => ({
        label: String(n?.label || 'Screen'),
        inputs: Array.isArray(n?.inputs) ? n.inputs.filter(Boolean).map(String) : [],
        actions: [
          ...(Array.isArray(n?.navButtons) ? n.navButtons : []),
          ...(Array.isArray(n?.functionalButtons) ? n.functionalButtons : []),
        ].filter(Boolean).map(String),
        isPostLogin: Boolean(n?.isPostLoginScreen),
      }))
      .sort((a: any, b: any) => a.label.localeCompare(b.label));

    const uniqueActions = new Set<string>();
    for (const e of edges) {
      if (e?.action) uniqueActions.add(String(e.action));
    }

    return {
      screensCount: screens.length,
      connectionsCount: edges.length,
      actionsCount: uniqueActions.size,
      postLoginScreens: screens.filter((s) => s.isPostLogin).length,
      topScreens: screens.slice(0, 50),
    };
  }, [crawlerGraph]);

  const crawlerGraphLayout = useMemo(() => {
    const g = crawlerGraph;
    const nodes = Array.isArray(g?.nodes) ? g.nodes : [];
    const edges = Array.isArray(g?.edges) ? g.edges : [];

    const maxNodes = 36;
    const sliced = nodes.slice(0, maxNodes);
    const nodeIds = sliced.map((n: any) => String(n?.uid ?? n?.id ?? "")).filter(Boolean);
    const byId = new Map<string, any>();
    sliced.forEach((n: any) => byId.set(String(n?.uid ?? n?.id ?? ""), n));

    const W = 1100;
    const H = 520;
    const cx = W / 2;
    const cy = H / 2;
    const r = Math.min(W, H) * 0.34;
    const pos = new Map<string, { x: number; y: number }>();
    const count = nodeIds.length;
    nodeIds.forEach((id, i) => {
      const a = (Math.PI * 2 * i) / Math.max(count, 1);
      pos.set(id, { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    });

    const visibleEdges = edges
      .map((e: any) => ({
        from: String(e?.from ?? e?.v ?? ""),
        to: String(e?.to ?? e?.w ?? ""),
        action: String(e?.action ?? ""),
        fromLabel: String(e?.fromLabel ?? ""),
        toLabel: String(e?.toLabel ?? ""),
      }))
      .filter((e: any) => pos.has(e.from) && pos.has(e.to));

    const toScreenshotUrl = (p: unknown, label: string) => {
      const raw = typeof p === 'string' ? p : '';
      if (!raw) {
        // Fallback: match by label against screenshots list
        const safe = (label || '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
        const hit = crawlerScreens.find((s) => (s?.name || '').toLowerCase().includes(safe));
        return hit?.url ? `${API_BASE || window.location.origin}${hit.url}` : '';
      }
      const parts = raw.split(/[/\\\\]/).filter(Boolean);
      const name = parts[parts.length - 1] || '';
      return name ? `${API_BASE || window.location.origin}/api/appium/screenshot/${encodeURIComponent(name)}` : '';
    };

    const labeledNodes = nodeIds.map((id) => {
      const n = byId.get(id);
      const label = String(n?.label || "Screen");
      const navButtons = Array.isArray(n?.navButtons) ? n.navButtons.map((x: unknown) => String(x)) : [];
      const functionalButtons = Array.isArray(n?.functionalButtons)
        ? n.functionalButtons.map((x: unknown) => String(x))
        : [];
      const outgoing = visibleEdges
        .filter((e: { from: string }) => e.from === id)
        .map((e: { from: string; to: string; action: string; toLabel: string }) => {
          const toNode = byId.get(e.to);
          const toLabel = String(toNode?.label || e.toLabel || e.to);
          return {
            action: e.action || '(tap)',
            toId: e.to,
            toLabel,
            sameScreen: e.from === e.to,
          };
        });
      return {
        id,
        label,
        navButtons,
        functionalButtons,
        outgoing,
        outgoingCount: outgoing.length,
        screenshotUrl: toScreenshotUrl(n?.screenshot, label),
        x: pos.get(id)!.x,
        y: pos.get(id)!.y,
      };
    });

    return {
      width: W,
      height: H,
      truncated: nodes.length > maxNodes,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      nodes: labeledNodes,
      edges: visibleEdges,
    };
  }, [crawlerGraph, crawlerScreens]);

  const [hoverNode, setHoverNode] = useState<any | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const hoverOutCount = useMemo(() => {
    if (!hoverNode) return { in: 0, out: 0 };
    let ins = 0;
    let outs = 0;
    for (const e of crawlerGraphLayout.edges) {
      // Ignore self-loops for in/out counts (e.g., "SIGN IN" on same node)
      if (e.from === e.to) continue;
      if (e.from === hoverNode.id) outs += 1;
      if (e.to === hoverNode.id) ins += 1;
    }
    return { in: ins, out: outs };
  }, [hoverNode, crawlerGraphLayout.edges]);

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
    if (currentStep !== 7 || !appId.trim()) return;
    fetchNavigationGraphMeta();
    fetchEnrichedList();
  }, [currentStep, appId, fetchNavigationGraphMeta, fetchEnrichedList]);

  useEffect(() => {
    if (currentStep !== 7 || !appId.trim()) return;
    const t = setInterval(fetchEnrichedList, 1500);
    return () => clearInterval(t);
  }, [currentStep, appId, fetchEnrichedList]);

  const enumeratePathsBounded = useCallback(
    (
      edges: Array<{ from: string; to: string; action?: string }>,
      startUid: string,
      endUid: string,
      maxPaths = 50,
      maxDepth = 12
    ) => {
      const adj = new Map<string, Array<{ to: string; action: string }>>();
      for (const e of edges) {
        const from = String((e as any)?.from ?? '');
        const to = String((e as any)?.to ?? '');
        if (!from || !to) continue;
        const action = String((e as any)?.action ?? '').trim();
        if (!adj.has(from)) adj.set(from, []);
        adj.get(from)!.push({ to, action: action || '(tap)' });
      }

      const results: Array<{ nodes: string[]; actions: string[] }> = [];
      let truncated = false;

      const dfs = (
        node: string,
        visited: Set<string>,
        nodesAcc: string[],
        actionsAcc: string[]
      ) => {
        if (results.length >= maxPaths) {
          truncated = true;
          return;
        }
        if (actionsAcc.length > maxDepth) return;
        if (node === endUid) {
          results.push({ nodes: [...nodesAcc], actions: [...actionsAcc] });
          return;
        }
        const outs = adj.get(node) || [];
        for (const step of outs) {
          if (visited.has(step.to)) continue; // simple paths only
          visited.add(step.to);
          nodesAcc.push(step.to);
          actionsAcc.push(step.action);
          dfs(step.to, visited, nodesAcc, actionsAcc);
          actionsAcc.pop();
          nodesAcc.pop();
          visited.delete(step.to);
          if (results.length >= maxPaths) {
            truncated = true;
            return;
          }
        }
      };

      const v = new Set<string>();
      v.add(startUid);
      dfs(startUid, v, [startUid], []);
      return { paths: results, truncated };
    },
    []
  );

  const normalizeKey = useCallback(
    (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ''),
    []
  );

  const fetchParsedCreds = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/appium/test-creds-parsed`);
      const d = await r.json().catch(() => ({}));
      if (r.ok && d && typeof d === 'object') {
        setTestCredsParsed(
          (d as any)?.items && typeof (d as any).items === 'object'
            ? (d as any).items
            : (d as any)
        );
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchGraphInputsGenerated = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/appium/graph-inputs`);
      const d = await r.json().catch(() => null);
      if (r.ok) {
        setGraphInputsGenerated(d);
      } else {
        setGraphInputsGenerated(null);
      }
    } catch {
      setGraphInputsGenerated(null);
    }
  }, []);

  const prefillInputsForPath = useCallback(
    (pathNodes: string[], graphNodesByUid: Map<string, any>) => {
      const next: Record<string, Record<string, string>> = {};

      // Build a merged map of enriched inputs by screen label
      const enrichedByLabel: Record<string, Record<string, string>> = {};
      for (const item of enrichedItems) {
        const m = item?.test_inputs_by_screen;
        if (!m || typeof m !== 'object') continue;
        for (const [label, fields] of Object.entries(m as any)) {
          if (!fields || typeof fields !== 'object') continue;
          enrichedByLabel[String(label)] = {
            ...(enrichedByLabel[String(label)] || {}),
            ...(fields as any),
          };
        }
      }

      for (const uid of pathNodes) {
        const n = graphNodesByUid.get(uid);
        const label = String(n?.label || uid);
        const inputs = Array.isArray(n?.inputs) ? n.inputs.map((x: any) => String(x)) : [];
        if (inputs.length === 0) continue;

        const enrichedFields = enrichedByLabel[label] || {};
        const generatedByUid = (graphInputsGenerated?.items_by_uid || {})[uid] || {};
        const generatedByLabel = (graphInputsGenerated?.items_by_label || {})[label] || {};
        const credsFields = testCredsParsed[label] || {};

        next[uid] = next[uid] || {};

        for (const hintRaw of inputs) {
          const hint = String(hintRaw || '').trim();
          if (!hint) continue;
          if (hint === 'No inputs') continue;

          const hintNorm = normalizeKey(hint);

          // 1) Test creds: match by key name included in hint (or vice versa)
          let value = '';
          for (const [k, v] of Object.entries(credsFields)) {
            const kNorm = normalizeKey(String(k));
            if (!kNorm) continue;
            if (hintNorm.includes(kNorm) || kNorm.includes(hintNorm)) {
              value = String(v ?? '');
              break;
            }
          }

          // 2) Step 7 suggestions: match by key name included in hint (or vice versa)
          if (!value) {
            for (const [k, v] of Object.entries(enrichedFields)) {
              const kNorm = normalizeKey(String(k));
              if (!kNorm) continue;
              if (hintNorm.includes(kNorm) || kNorm.includes(hintNorm)) {
                value = String(v ?? '');
                break;
              }
            }
          }

          // 3) Generated graph inputs: by uid and label
          if (!value) {
            const mergedGen = { ...generatedByLabel, ...generatedByUid };
            for (const [k, v] of Object.entries(mergedGen)) {
              const kNorm = normalizeKey(String(k));
              if (!kNorm) continue;
              if (hintNorm.includes(kNorm) || kNorm.includes(hintNorm)) {
                value = String(v ?? '');
                break;
              }
            }
          }

          // 4) Leave blank for user/manual

          next[uid][hint] = value;
        }
      }

      setInputsByScreen(next);
    },
    [enrichedItems, graphInputsGenerated, normalizeKey, testCredsParsed]
  );

  useEffect(() => {
    if (currentStep !== 8) return;
    // Ensure we have latest graph + creds when entering Step 8
    fetchCrawlerOutput();
    fetchParsedCreds();
    fetchGraphInputsGenerated();
  }, [currentStep, fetchCrawlerOutput, fetchParsedCreds, fetchGraphInputsGenerated]);

  const fetchUserflowLog = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/appium/userflow-log?tail=500`);
      const d = await r.json().catch(() => ({}));
      if (r.ok && Array.isArray(d?.lines)) {
        setRunFlowLog(d.lines.join("\n"));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (currentStep !== 9) return;
    const t = setInterval(fetchUserflowLog, 1200);
    return () => clearInterval(t);
  }, [currentStep, fetchUserflowLog]);

  const fetchUserflowVideos = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/appium/userflow-videos`);
      const d = await r.json().catch(() => ({}));
      if (r.ok && Array.isArray(d?.items)) {
        setUserflowVideoItems(d.items);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchUserflowResult = useCallback(async () => {
    if (!lastRunFlowRequestId) return;
    try {
      const r = await fetch(`${API_BASE}/api/appium/userflow-result/${encodeURIComponent(lastRunFlowRequestId)}`);
      if (!r.ok) return;
      const d = await r.json().catch(() => ({}));
      setUserflowResult(d);
    } catch {
      // ignore
    }
  }, [lastRunFlowRequestId]);

  useEffect(() => {
    if (currentStep !== 10) return;
    fetchUserflowVideos();
    fetchUserflowLog();
    fetchUserflowResult();
    const t = setInterval(() => {
      fetchUserflowVideos();
      fetchUserflowLog();
      fetchUserflowResult();
    }, 2000);
    return () => clearInterval(t);
  }, [currentStep, fetchUserflowVideos, fetchUserflowLog, fetchUserflowResult]);

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
    if ((currentStep === 3 || currentStep === 6) && appId.trim()) {
      fetchStats();
      const interval = setInterval(fetchStats, 3000);
      return () => clearInterval(interval);
    }
  }, [currentStep, appId]);

  useEffect(() => {
    if (currentStep !== 5) return;
    fetchCrawlerOutput();
  }, [currentStep, fetchCrawlerOutput]);

  useEffect(() => {
    const root = stepperScrollRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(`[data-step-id="${currentStep}"]`);
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [currentStep]);

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

          {/* Stepper — compact pipeline; every step uses the same tile geometry */}
          <div className="mb-8 overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card/90 to-card/40 shadow-sm">
            <div className="flex flex-col gap-2 border-b border-border/60 bg-background/20 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Pipeline</p>
              <p className="text-sm text-foreground/90 sm:text-right">
                <span className="text-muted-foreground">Step {currentStep} of {STEPS.length}</span>
                <span className="mx-2 text-muted-foreground/50">·</span>
                <span className="font-medium text-primary">{STEPS.find((s) => s.id === currentStep)?.label}</span>
              </p>
            </div>
            <div className="px-3 pt-2 sm:px-4">
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted/60">
                <div
                  className="h-full rounded-full bg-primary/90 transition-[width] duration-300 ease-out"
                  style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
                />
              </div>
            </div>
            <div
              ref={stepperScrollRef}
              className="flex flex-nowrap items-stretch gap-0.5 overflow-x-auto px-2 py-2.5 sm:px-3 sm:py-3 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/80"
            >
              {STEPS.map((step, i) => {
                const done = currentStep > step.id;
                const active = currentStep === step.id;
                return (
                  <span key={step.id} className="flex shrink-0 items-stretch">
                    <button
                      type="button"
                      data-step-id={step.id}
                      onClick={() => {
                        if (step.id !== 1 && !appId.trim()) return;
                        setCurrentStep(step.id);
                      }}
                      disabled={step.id !== 1 && !appId.trim()}
                      title={step.id !== 1 && !appId.trim() ? 'Enter App ID first' : `Go to ${step.label}`}
                      className={`flex min-h-[4.85rem] min-w-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-center transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                        active
                          ? 'border-primary/55 bg-primary/12 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
                          : done
                            ? 'border-primary/20 bg-primary/5 hover:border-primary/35 hover:bg-primary/10'
                            : 'border-border/60 bg-muted/25 hover:border-border hover:bg-muted/45'
                      }`}
                    >
                      <span
                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums transition-colors ${
                          done
                            ? 'bg-primary text-primary-foreground'
                            : active
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'border border-border/70 bg-background/80 text-foreground/75'
                        }`}
                      >
                        {done ? <Check size={15} strokeWidth={2.5} /> : step.id}
                      </span>
                      <span
                        className={`max-w-[5.25rem] text-[10px] leading-snug sm:text-[11px] ${
                          active ? 'font-semibold text-foreground' : done ? 'text-foreground/75' : 'text-foreground/60'
                        }`}
                      >
                        {step.short}
                      </span>
                    </button>
                    {i < STEPS.length - 1 && (
                      <span className="flex w-2 shrink-0 items-center justify-center self-center px-0.5" aria-hidden>
                        <span className="block h-px w-3 max-w-full bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
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
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Scrape reviews</CardTitle>
                <CardDescription>
                  {appId.trim() === 'com.edutech'
                    ? 'Reviews are being fetched and imported into the pipeline.'
                    : 'Reviews are fetched from the Play Store. You can stop anytime and proceed with what was scraped.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: controls + status */}
                <div className="space-y-6">
                  <p className="text-sm text-muted-foreground">App ID: <strong>{appId}</strong></p>

                  {appId.trim() === 'com.edutech' ? (
                    <>
                      {demoStreamStatus === 'idle' && (
                        <>
                          <Button
                            onClick={handleScrape}
                            disabled={!appId.trim()}
                            className="w-full bg-primary text-primary-foreground hover:bg-secondary"
                          >
                            Start fetching
                          </Button>
                        </>
                      )}

                      {demoStreamStatus !== 'idle' && (
                        <>
                          <div className="flex flex-col items-center py-6">
                            <span className="text-sm text-muted-foreground mb-2">Reviews fetched</span>
                            <span className={`text-5xl font-bold tabular-nums text-primary transition-all duration-300 ease-out ${demoStreamStatus === 'running' ? 'animate-pulse' : ''}`}>
                              {displayCount.toLocaleString()}
                            </span>
                            <span className="mt-2 text-sm text-muted-foreground">
                              {demoStreamStatus === 'running' && 'Fetching…'}
                              {demoStreamStatus === 'done' && 'Ready to classify'}
                              {demoStreamStatus === 'error' && 'Error'}
                            </span>
                            <span className="mt-2 text-xs text-muted-foreground">
                              {demoSent.toLocaleString()} received
                              {demoImported > 0 ? ` • ${demoImported.toLocaleString()} imported` : ''}
                            </span>
                          </div>

                          {demoStreamStatus === 'running' && (
                            <Button
                              variant="destructive"
                              onClick={() => {
                                if (demoStreamRef.current) {
                                  try { demoStreamRef.current.close(); } catch { /* ignore */ }
                                  demoStreamRef.current = null;
                                }
                                setDemoStreamStatus('done');
                                setScrapeProgressStatus('ready');
                                setScrapeStatus('Fetch stopped. You can proceed with the reviews fetched so far.');
                              }}
                              className="w-full"
                            >
                              Stop fetching
                            </Button>
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

                      {demoStreamError && (
                        <div className={`p-4 border rounded ${getNoticeClasses(demoStreamError)}`}>
                          {demoStreamError}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
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
                    </>
                  )}

                  {scrapeStatus && (
                    <div className={`p-4 border rounded ${getNoticeClasses(scrapeStatus)}`}>
                      {scrapeStatus}
                    </div>
                  )}
                </div>

                {/* Right: reviews in DB + new items as they arrive */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Reviews</p>
                      <p className="text-xs text-muted-foreground">
                        All cleaned reviews stored for this app; new ones appear as scraping or fetch runs.
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={isAutoScrollLocked}
                        onChange={(e) => setIsAutoScrollLocked(e.target.checked)}
                      />
                      Auto-scroll
                    </label>
                  </div>

                  <div
                    ref={liveReviewsBoxRef}
                    className="border rounded-lg p-3 bg-muted/20 h-[420px] overflow-auto space-y-3"
                    onScroll={() => {
                      const el = liveReviewsBoxRef.current;
                      if (!el) return;
                      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
                      setIsAutoScrollLocked(nearBottom);
                    }}
                  >
                    {liveReviews.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No reviews yet.</p>
                    ) : (
                      liveReviews.map((r, idx) => (
                        <div
                          key={r?.id != null ? String(r.id) : `r-${idx}-${reviewPanelDisplayText(r).slice(0, 24)}`}
                          className="p-3 rounded border bg-card/40 transition-all duration-300 ease-out"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium truncate">
                              {r?.userName || 'Anonymous'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {typeof r?.score === 'number' ? `${r.score}/5` : ''}
                            </p>
                          </div>
                          <p className="text-sm text-foreground/90 mt-2 whitespace-pre-wrap">
                            {reviewPanelDisplayText(r)}
                          </p>
                          {r?.date && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {String(r.date).slice(0, 10)}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Classify */}
          {currentStep === 3 && (
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="text-primary" size={24} />
                  Review Classification
                </CardTitle>
                <CardDescription>
                  Classify reviews using sentiment analysis and zero-shot classification
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: controls */}
                <div className="space-y-6">
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
                </div>

                {/* Right: classified rows (all loaded + polling) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Classification</p>
                      <p className="text-xs text-muted-foreground">
                        All classified reviews loaded for this app; the list refreshes while you classify.
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={classifiedAutoScroll}
                        onChange={(e) => setClassifiedAutoScroll(e.target.checked)}
                      />
                      Auto-scroll
                    </label>
                  </div>
                  <div
                    ref={classifiedBoxRef}
                    className="border rounded-lg p-3 bg-muted/20 h-[420px] overflow-auto space-y-3"
                    onScroll={() => {
                      const el = classifiedBoxRef.current;
                      if (!el) return;
                      const nearTop = el.scrollTop < 80;
                      setClassifiedAutoScroll(nearTop);
                    }}
                  >
                    {liveClassified.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No classified reviews yet.</p>
                    ) : (
                      liveClassified.map((r, idx) => (
                        <div key={`${r?.id || idx}-${idx}`} className="p-3 rounded border bg-card/40">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs text-muted-foreground truncate">
                              {r?.sentiment ? `Sentiment: ${r.sentiment}` : 'Sentiment: —'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(Array.isArray(r?.labels) && r.labels.length > 0) ? r.labels.slice(0, 2).join(', ') : 'No labels'}
                              {(Array.isArray(r?.labels) && r.labels.length > 2) ? '…' : ''}
                            </p>
                          </div>
                          <p className="text-sm text-foreground/90 mt-2 whitespace-pre-wrap">
                            {r?.reviewText || ''}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
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
                    APK upload
                  </CardTitle>
                  <CardDescription>
                    Upload the APK you want the crawler to install and use (this replaces the hardcoded path in the crawler).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Input
                      type="file"
                      accept=".apk"
                      ref={apkInputRef}
                      className="bg-input border-border"
                      onChange={(e) => handleApkSelection(e.target.files?.[0] ?? null)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isUploadingApk}
                      onClick={() => apkInputRef.current?.click()}
                    >
                      {isUploadingApk ? 'Uploading…' : 'Choose APK'}
                    </Button>
                  </div>
                  {apkStatus && (
                    <div className={`mt-2 p-3 border rounded ${getNoticeClasses(apkStatus)}`}>
                      {apkStatus}
                    </div>
                  )}
                </CardContent>
              </Card>

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
                    2. Upload your APK above (recommended), or install it manually in the emulator.
                    3. After install/opening the app, click <strong>Start crawler</strong> to attach and build the navigation graph.
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
                    <Button
                      variant="destructive"
                      onClick={handleStopCrawler}
                      disabled={isStartingCrawler}
                      className="flex-1 sm:flex-none"
                      title="Stop the crawler and export graph_output.json"
                    >
                      Stop & save graph
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
                    Next: View crawler output
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 5: Crawler output preview */}
          {currentStep === 5 && (
            <div className="w-full">
              <Card className="w-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Navigation className="text-primary" size={24} />
                    Crawler output
                  </CardTitle>
                  <CardDescription>
                    Preview the latest crawler output (graph JSON + screenshots) before generating test cases.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-muted-foreground">
                      {crawlerGraphStatus || '—'}
                    </div>
                    <div className="flex gap-2 sm:justify-end">
                      <Button variant="outline" onClick={fetchCrawlerOutput}>
                        Refresh
                      </Button>
                      <Button onClick={() => setCurrentStep(6)}>
                        Next: Generate test cases
                      </Button>
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-5 items-stretch">
                    <div className="border rounded-xl bg-card/40 flex flex-col h-[620px]">
                      <div className="flex items-center justify-between px-4 py-3 border-b">
                        <span className="text-sm font-medium">Navigation summary</span>
                      </div>
                      <div className="p-4 flex-1 min-h-0 overflow-auto space-y-4">
                        {!crawlerGraph ? (
                          <p className="text-sm text-muted-foreground">No graph loaded.</p>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-lg border bg-background/30 p-3">
                                <p className="text-xs text-muted-foreground">Screens found</p>
                                <p className="text-2xl font-semibold">{crawlerSummary.screensCount}</p>
                              </div>
                              <div className="rounded-lg border bg-background/30 p-3">
                                <p className="text-xs text-muted-foreground">Connections</p>
                                <p className="text-2xl font-semibold">{crawlerSummary.connectionsCount}</p>
                              </div>
                              <div className="rounded-lg border bg-background/30 p-3">
                                <p className="text-xs text-muted-foreground">Unique actions</p>
                                <p className="text-2xl font-semibold">{crawlerSummary.actionsCount}</p>
                              </div>
                              <div className="rounded-lg border bg-background/30 p-3">
                                <p className="text-xs text-muted-foreground">Post-login screens</p>
                                <p className="text-2xl font-semibold">{crawlerSummary.postLoginScreens}</p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <p className="text-sm font-medium">Screens (sample)</p>
                              <p className="text-xs text-muted-foreground">
                                A readable preview of discovered screens, expected inputs, and actions.
                              </p>
                              <div className="space-y-2">
                                {crawlerSummary.topScreens.map((s: any, idx: number) => (
                                  <div key={`${s.label}-${idx}`} className="rounded-lg border bg-background/20 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                      <p className="text-sm font-medium truncate">{s.label}</p>
                                      {s.isPostLogin && (
                                        <span className="text-[11px] px-2 py-0.5 rounded-full border bg-primary/10 text-primary">
                                          Post-login
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                                      <div>
                                        <span className="font-medium text-foreground/80">Inputs:</span>{' '}
                                        {s.inputs.length ? s.inputs.slice(0, 4).join(', ') : 'None'}
                                        {s.inputs.length > 4 ? '…' : ''}
                                      </div>
                                      <div>
                                        <span className="font-medium text-foreground/80">Actions:</span>{' '}
                                        {s.actions.length ? s.actions.slice(0, 4).join(', ') : 'None'}
                                        {s.actions.length > 4 ? '…' : ''}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="border rounded-xl bg-card/40 flex flex-col h-[620px]">
                      <div className="flex items-center justify-between px-4 py-3 border-b">
                        <span className="text-sm font-medium">Screenshots</span>
                        <span className="text-xs text-muted-foreground">
                          {crawlerScreens.length > 0 ? `${crawlerScreenIdx + 1}/${crawlerScreens.length}` : '0'}
                        </span>
                      </div>

                      <div className="p-4 flex-1 min-h-0 overflow-auto">
                        {crawlerScreens.length === 0 ? (
                          <div className="text-sm text-muted-foreground">No screenshots found.</div>
                        ) : (
                          <div className="space-y-3">
                            <div className="rounded-xl overflow-hidden bg-background/20">
                              <div className="relative w-full h-[520px] bg-black/5 flex items-center justify-center p-3 sm:p-6">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  disabled={crawlerScreenIdx <= 0}
                                  onClick={() => setCrawlerScreenIdx((i) => Math.max(0, i - 1))}
                                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
                                  aria-label="Previous screenshot"
                                >
                                  <ChevronLeft size={18} />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  disabled={crawlerScreenIdx >= crawlerScreens.length - 1}
                                  onClick={() => setCrawlerScreenIdx((i) => Math.min(crawlerScreens.length - 1, i + 1))}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10"
                                  aria-label="Next screenshot"
                                >
                                  <ChevronRight size={18} />
                                </Button>

                                {/* Phone mockup frame */}
                                <div className="relative h-full aspect-[9/19.5] max-h-full w-auto mx-auto">
                                  {/* Outer device body */}
                                  <div className="absolute inset-0 rounded-[2.05rem] bg-neutral-950 shadow-2xl ring-1 ring-white/10" />
                                  {/* Bezel (thinner) */}
                                  <div className="absolute inset-[3px] rounded-[1.88rem] bg-neutral-900/95" />
                                  {/* Speaker */}
                                  <div className="absolute left-1/2 top-[9px] -translate-x-1/2 h-3.5 w-16 rounded-full bg-black/60 ring-1 ring-white/10" />
                                  {/* Screen */}
                                  <div className="absolute inset-[7px] rounded-[1.62rem] overflow-hidden bg-black shadow-inner">
                                    <img
                                      src={`${API_BASE || window.location.origin}${crawlerScreens[crawlerScreenIdx].url}`}
                                      alt={crawlerScreens[crawlerScreenIdx].name}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                            {/* Hide raw filenames for cleaner UI */}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-xl bg-card/40">
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">Graph</p>
                        <p className="text-xs text-muted-foreground">
                          Visual view from <code className="bg-muted px-1 rounded">graph_output.json</code>. Hover a
                          screen for detected nav buttons and each recorded tap → destination.
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {crawlerGraphLayout.nodeCount} nodes • {crawlerGraphLayout.edgeCount} edges
                        {crawlerGraphLayout.truncated ? ' • showing first 36 nodes' : ''}
                      </div>
                    </div>
                    <div className="p-3 overflow-visible">
                      {!crawlerGraph ? (
                        <p className="text-sm text-muted-foreground p-3">No graph loaded.</p>
                      ) : (
                        <div className="relative">
                          <svg
                            width="100%"
                            height={crawlerGraphLayout.height}
                            viewBox={`0 0 ${crawlerGraphLayout.width} ${crawlerGraphLayout.height}`}
                            className="bg-background/20 rounded-lg border w-full"
                            onMouseMove={(e) => {
                              const svg = e.currentTarget as SVGSVGElement;
                              const rect = svg.getBoundingClientRect();
                              const x = ((e.clientX - rect.left) / rect.width) * crawlerGraphLayout.width;
                              const y = ((e.clientY - rect.top) / rect.height) * crawlerGraphLayout.height;
                              let best: any = null;
                              let bestD = 1e9;
                              for (const n of crawlerGraphLayout.nodes) {
                                const dx = n.x - x;
                                const dy = n.y - y;
                                const d = Math.sqrt(dx * dx + dy * dy);
                                if (d < bestD) {
                                  bestD = d;
                                  best = n;
                                }
                              }
                              if (best && bestD < 28) {
                                setHoverNode(best);
                                setHoverPos({ x: e.clientX, y: e.clientY });
                              } else {
                                setHoverNode(null);
                                setHoverPos(null);
                              }
                            }}
                            onMouseLeave={() => {
                              setHoverNode(null);
                              setHoverPos(null);
                            }}
                          >
                            <defs>
                              <marker
                                id="arrowOut"
                                viewBox="0 0 10 10"
                                refX="9"
                                refY="5"
                                markerWidth="6"
                                markerHeight="6"
                                orient="auto"
                              >
                                <path d="M 0 1 L 10 5 L 0 9 z" fill="rgba(45,212,191,1)" />
                              </marker>
                              <marker
                                id="arrowIn"
                                viewBox="0 0 10 10"
                                refX="9"
                                refY="5"
                                markerWidth="6"
                                markerHeight="6"
                                orient="auto"
                              >
                                <path d="M 0 1 L 10 5 L 0 9 z" fill="rgba(168,85,247,1)" />
                              </marker>
                              <marker
                                id="arrow"
                                viewBox="0 0 10 10"
                                refX="9"
                                refY="5"
                                markerWidth="6"
                                markerHeight="6"
                                orient="auto"
                              >
                                <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(148,163,184,0.7)" />
                              </marker>
                              <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
                                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.35)" />
                              </filter>
                              <radialGradient id="nodeGlow" cx="30%" cy="30%" r="70%">
                                <stop offset="0%" stopColor="rgba(45,212,191,0.95)" />
                                <stop offset="100%" stopColor="rgba(20,184,166,0.25)" />
                              </radialGradient>
                            </defs>

                            {/* edges */}
                            {crawlerGraphLayout.edges.map((ed, idx) => {
                              const a = crawlerGraphLayout.nodes.find((n) => n.id === ed.from);
                              const b = crawlerGraphLayout.nodes.find((n) => n.id === ed.to);
                              if (!a || !b) return null;
                              const isOut = hoverNode && ed.from === hoverNode.id;
                              const isIn = hoverNode && ed.to === hoverNode.id;
                              const stroke = isOut
                                ? "rgba(45,212,191,0.95)"
                                : isIn
                                  ? "rgba(168,85,247,0.95)"
                                  : "rgba(148,163,184,0.55)";
                              const marker = isOut ? "url(#arrowOut)" : isIn ? "url(#arrowIn)" : "url(#arrow)";
                              const width = 1.6;
                              // Trim the line so arrows don't look too long (avoid overlapping nodes).
                              const nodeR = 18;
                              const trim = nodeR + 10;

                              // Slight curve to reduce overlap
                              const mx = (a.x + b.x) / 2;
                              const my = (a.y + b.y) / 2;
                              const bend = 0.06; // smaller bend = cleaner
                              const cx = mx + (a.y - b.y) * bend;
                              const cy = my + (b.x - a.x) * bend;

                              // Move start/end points inward along the curve tangents (approx).
                              const sx0 = a.x, sy0 = a.y;
                              const ex0 = b.x, ey0 = b.y;

                              // Start tangent points from start -> control
                              const sdx = cx - sx0;
                              const sdy = cy - sy0;
                              const sl = Math.sqrt(sdx * sdx + sdy * sdy) || 1;
                              const sx = sx0 + (sdx / sl) * trim;
                              const sy = sy0 + (sdy / sl) * trim;

                              // End tangent from control -> end (for arrow direction)
                              const edx = ex0 - cx;
                              const edy = ey0 - cy;
                              const el = Math.sqrt(edx * edx + edy * edy) || 1;
                              const ex = ex0 - (edx / el) * trim;
                              const ey = ey0 - (edy / el) * trim;

                              const d = `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;
                              const actionStr = String((ed as { action?: string }).action || '').trim();
                              const showEdgeLabel =
                                Boolean(actionStr) &&
                                hoverNode &&
                                ((ed as { from: string }).from === hoverNode.id ||
                                  (ed as { to: string }).to === hoverNode.id);
                              const shortAction =
                                actionStr.length > 24 ? `${actionStr.slice(0, 24)}…` : actionStr;
                              const lx = 0.25 * sx + 0.5 * cx + 0.25 * ex;
                              const ly = 0.25 * sy + 0.5 * cy + 0.25 * ey;
                              return (
                                <g key={idx}>
                                  <path
                                    d={d}
                                    fill="none"
                                    stroke={stroke}
                                    strokeWidth={width}
                                    strokeLinecap="round"
                                    markerEnd={marker}
                                  />
                                  {showEdgeLabel ? (
                                    <text
                                      x={lx}
                                      y={ly}
                                      textAnchor="middle"
                                      dominantBaseline="middle"
                                      fill="rgba(226,232,240,0.98)"
                                      fontSize="10"
                                      fontFamily="ui-sans-serif, system-ui"
                                      paintOrder="stroke"
                                      stroke="rgba(15,23,42,0.92)"
                                      strokeWidth="3"
                                      strokeLinejoin="round"
                                    >
                                      {shortAction}
                                    </text>
                                  ) : null}
                                </g>
                              );
                            })}

                            {/* nodes */}
                            {crawlerGraphLayout.nodes.map((n) => (
                              <g key={n.id} filter="url(#softShadow)">
                                <circle
                                  cx={n.x}
                                  cy={n.y}
                                  r={18}
                                  fill="url(#nodeGlow)"
                                  stroke="rgba(45,212,191,0.6)"
                                  strokeWidth="1.6"
                                />
                                <text
                                  x={n.x}
                                  y={n.y + 36}
                                  textAnchor="middle"
                                  fill="rgba(226,232,240,0.95)"
                                  fontSize="12"
                                  fontFamily="ui-sans-serif, system-ui"
                                >
                                  {n.label.length > 16 ? `${n.label.slice(0, 16)}…` : n.label}
                                </text>
                                {n.outgoingCount > 0 ? (
                                  <text
                                    x={n.x}
                                    y={n.y + 50}
                                    textAnchor="middle"
                                    fill="rgba(148,163,184,0.9)"
                                    fontSize="9"
                                    fontFamily="ui-sans-serif, system-ui"
                                  >
                                    {n.outgoingCount} tap{n.outgoingCount === 1 ? '' : 's'} recorded
                                  </text>
                                ) : null}
                              </g>
                            ))}
                          </svg>

                          {hoverNode && hoverPos && typeof document !== 'undefined' && (
                            createPortal(
                              <div
                                className="fixed pointer-events-none w-[22rem] max-h-[min(70vh,520px)] overflow-y-auto rounded-lg border bg-background/95 backdrop-blur p-2 shadow-xl z-[9999]"
                                style={{
                                  left: (() => {
                                    const vv = (window as any).visualViewport;
                                    const vw = (vv?.width ?? window.innerWidth) as number;
                                    const ox = (vv?.offsetLeft ?? 0) as number;
                                    const desired = hoverPos.x + 16;
                                    const max = ox + vw - 380; // tooltip width + margin
                                    const min = ox + 8;
                                    return Math.max(min, Math.min(desired, max));
                                  })(),
                                  top: (() => {
                                    const vv = (window as any).visualViewport;
                                    const vh = (vv?.height ?? window.innerHeight) as number;
                                    const oy = (vv?.offsetTop ?? 0) as number;
                                    const desired = hoverPos.y + 16;
                                    const max = oy + vh - 360; // clamp above OS bars/taskbar
                                    const min = oy + 8;
                                    return Math.max(min, Math.min(desired, max));
                                  })(),
                                }}
                              >
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <div className="text-xs font-medium truncate">{hoverNode.label}</div>
                                  <div className="text-[11px] text-muted-foreground shrink-0">
                                    <span className="text-purple-300">{hoverOutCount.in} in</span>
                                    <span className="mx-1">•</span>
                                    <span className="text-teal-300">{hoverOutCount.out} out</span>
                                  </div>
                                </div>
                                {hoverNode.screenshotUrl ? (
                                  <div className="rounded-md overflow-hidden border bg-black/5 mb-2">
                                    <img
                                      src={hoverNode.screenshotUrl}
                                      alt={hoverNode.label}
                                      className="w-full h-40 object-contain bg-white"
                                      loading="lazy"
                                    />
                                  </div>
                                ) : null}

                                {Array.isArray(hoverNode.navButtons) && hoverNode.navButtons.length > 0 && (
                                  <div className="mb-2">
                                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Nav buttons (on this screen)</div>
                                    <div className="flex flex-wrap gap-1">
                                      {hoverNode.navButtons.map((b: string, i: number) => (
                                        <span
                                          key={`nb-${i}`}
                                          className="text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border/60 max-w-[200px] truncate"
                                          title={b}
                                        >
                                          {b}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {Array.isArray(hoverNode.functionalButtons) && hoverNode.functionalButtons.length > 0 && (
                                  <div className="mb-2">
                                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                                      Other controls
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {hoverNode.functionalButtons.map((b: string, i: number) => (
                                        <span
                                          key={`fb-${i}`}
                                          className="text-[10px] px-1.5 py-0.5 rounded bg-muted/70 border border-border/60 max-w-[200px] truncate"
                                          title={b}
                                        >
                                          {b}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {Array.isArray(hoverNode.outgoing) && hoverNode.outgoing.length > 0 && (
                                  <div>
                                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                                      Where taps go (edges)
                                    </div>
                                    <ul className="space-y-1 text-[11px] leading-snug">
                                      {hoverNode.outgoing.map((t: { action: string; toLabel: string; sameScreen: boolean }, i: number) => (
                                        <li key={`out-${i}`} className="rounded border border-border/50 bg-muted/40 px-2 py-1">
                                          <span className="text-teal-300 font-medium">{t.action}</span>
                                          <span className="text-muted-foreground"> → </span>
                                          <span className={t.sameScreen ? 'text-muted-foreground' : 'text-foreground'}>
                                            {t.sameScreen ? `${t.toLabel} (same screen)` : t.toLabel}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>,
                              document.body
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 6: Test cases */}
          {currentStep === 6 && (
            <Card className="w-full">
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
                {/* Shared header row (spans both columns) */}
                <div className="space-y-2">
                  <Label>App ID</Label>
                  <Input
                    value={appId}
                    onChange={(e) => setAppId(DOMPurify.sanitize(e.target.value))}
                    className="bg-input border-border"
                    disabled={isGeneratingTestCases}
                  />
                  <p className="text-sm text-muted-foreground">
                    Classified reviews without test cases will be processed. Already-generated test cases are skipped.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6 items-start">
                  {/* Left: controls */}
                  <div className="space-y-6">
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
                      onClick={async () => {
                        await handleGenerateTestCases();
                        fetchLatestTestCases();
                      }}
                      disabled={isGeneratingTestCases || !appId.trim()}
                      className="w-full bg-primary text-primary-foreground hover:bg-secondary"
                    >
                      {isGeneratingTestCases ? 'Loading…' : 'Show next generated test case'}
                    </Button>
                    {testCaseStatus && (
                      <div className={`p-4 border rounded ${getNoticeClasses(testCaseStatus)}`}>
                        {testCaseStatus}
                      </div>
                    )}

                    {currentShownTc && (
                      <div className="p-4 border rounded bg-muted/30">
                        <h4 className="font-semibold mb-2">Current test case</h4>
                        <div className="text-sm space-y-2">
                          <div><strong>Given:</strong> {currentShownTc.given}</div>
                          <div><strong>When:</strong> {currentShownTc.when}</div>
                          <div><strong>Then:</strong> {currentShownTc.then}</div>
                        </div>
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
                      onClick={() => setCurrentStep(7)}
                      variant="outline"
                      className="w-full"
                      disabled={!appId.trim()}
                    >
                      Next: Enriched tests (inputs + scenarios)
                    </Button>
                  </div>

                  {/* Test cases list (all loaded + polling) */}
                  <div className="border rounded-lg bg-muted/20 overflow-hidden w-full">
                    <div className="flex items-start justify-between gap-4 px-4 py-3 border-b border-border/60 bg-background/10">
                      <div className="min-w-0">
                        <p className="font-medium">Test cases</p>
                        <p className="text-xs text-muted-foreground">
                          All generated Given–When–Then cases for this app; updates as new ones are saved.
                        </p>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground shrink-0 pt-0.5">
                        <input
                          type="checkbox"
                          checked={testCasesAutoScroll}
                          onChange={(e) => setTestCasesAutoScroll(e.target.checked)}
                        />
                        Auto-scroll
                      </label>
                    </div>

                    <div
                      ref={testCasesBoxRef}
                      className="p-3 h-[520px] overflow-auto space-y-3"
                      onScroll={() => {
                        const el = testCasesBoxRef.current;
                        if (!el) return;
                        const nearTop = el.scrollTop < 80;
                        setTestCasesAutoScroll(nearTop);
                      }}
                    >
                      {liveTestCases.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No test cases yet.</p>
                      ) : (
                        liveTestCases.map((tc, idx) => (
                          <div key={`${tc?.id || idx}-${idx}`} className="p-3 rounded border bg-card/40">
                            <p className="text-xs text-muted-foreground">
                              {tc?.test_case_type ? `Type: ${tc.test_case_type}` : 'Type: —'}
                            </p>
                            <div className="mt-2 space-y-2 text-sm leading-relaxed">
                              <div>
                                <span className="text-muted-foreground">Given:</span>{' '}
                                <span className="text-foreground/90">{tc?.given || ''}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">When:</span>{' '}
                                <span className="text-foreground/90">{tc?.when || ''}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Then:</span>{' '}
                                <span className="text-foreground/90">{tc?.then || ''}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 7: Enriched test outputs (navigation LoRA) */}
          {currentStep === 7 && (
            <Card className="w-full">
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
                            <div className="grid gap-3">
                              <div className="rounded-lg border bg-muted/30 p-3">
                                <div className="text-sm font-medium mb-2">Flow (Given / When / Then)</div>
                                <div className="text-sm space-y-2 leading-relaxed">
                                  <div><span className="text-muted-foreground">Given:</span> {item.given || '—'}</div>
                                  <div><span className="text-muted-foreground">When:</span> {item.when || '—'}</div>
                                  <div><span className="text-muted-foreground">Then:</span> {item.then || '—'}</div>
                                </div>
                              </div>

                              <div className="rounded-lg border bg-muted/30 p-3">
                                <div className="flex items-center justify-between gap-3 mb-2">
                                  <div className="text-sm font-medium">Inputs to try</div>
                                  <Button size="sm" variant="outline" onClick={() => startEditEnriched(item)}>
                                    Edit (advanced)
                                  </Button>
                                </div>

                                {item?.test_inputs_by_screen && Object.keys(item.test_inputs_by_screen || {}).length > 0 ? (
                                  <div className="space-y-3">
                                    {Object.entries(item.test_inputs_by_screen || {}).map(([screen, fields]: any) => (
                                      <div key={String(screen)} className="rounded border bg-background/30 p-3">
                                        <div className="text-sm font-medium mb-2">{String(screen)}</div>
                                        {fields && typeof fields === 'object' ? (
                                          <ul className="text-sm space-y-1">
                                            {Object.entries(fields).map(([k, v]: any) => (
                                              <li key={`${String(screen)}-${String(k)}`} className="flex flex-wrap gap-x-2">
                                                <span className="text-muted-foreground">{String(k)}:</span>
                                                <span className="font-mono text-xs bg-background/50 px-2 py-0.5 rounded">
                                                  {String(v)}
                                                </span>
                                              </li>
                                            ))}
                                          </ul>
                                        ) : (
                                          <div className="text-sm text-muted-foreground">No structured fields.</div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-sm text-muted-foreground">
                                    No input suggestions were generated for this item.
                                  </div>
                                )}
                              </div>

                              {Array.isArray(item?.expanded_test_cases) && item.expanded_test_cases.length > 0 && (
                                <div className="rounded-lg border bg-muted/30 p-3">
                                  <div className="text-sm font-medium mb-2">Expanded scenarios</div>
                                  <div className="space-y-3">
                                    {item.expanded_test_cases.slice(0, 5).map((tc: any, i: number) => (
                                      <div key={`${item.id}-exp-${i}`} className="rounded border bg-background/30 p-3">
                                        <div className="text-sm space-y-2 leading-relaxed">
                                          <div><span className="text-muted-foreground">Given:</span> {tc?.given || '—'}</div>
                                          <div><span className="text-muted-foreground">When:</span> {tc?.when || '—'}</div>
                                          <div><span className="text-muted-foreground">Then:</span> {tc?.then || '—'}</div>
                                        </div>
                                      </div>
                                    ))}
                                    {item.expanded_test_cases.length > 5 && (
                                      <div className="text-xs text-muted-foreground">
                                        Showing 5 of {item.expanded_test_cases.length}.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Button
                  onClick={() => setCurrentStep(8)}
                  variant="outline"
                  className="w-full"
                  disabled={!crawlerGraph}
                >
                  Next: Select flow (start/end + filters)
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 8: Select flow (start/end, path, inputs, filters) */}
          {currentStep === 8 && (
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="text-primary" size={24} />
                  Select flow
                </CardTitle>
                <CardDescription>
                  Pick a start and end screen, choose a path, then provide inputs and any filter steps you want to test.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-xs text-muted-foreground">
                  Suggested inputs:{" "}
                  {graphInputsGenerated ? (
                    <span className="text-primary">ready</span>
                  ) : (
                    <span>not generated yet (will appear after crawl finishes)</span>
                  )}
                </div>
                {!crawlerGraph ? (
                  <div className="p-4 border rounded bg-muted/30 text-sm">
                    <div className="font-medium mb-1">Graph not loaded</div>
                    <div className="text-muted-foreground">
                      Run the crawler (Step 4/5) first, then come back here.
                    </div>
                    {crawlerGraphStatus && <div className="mt-2 text-muted-foreground">{crawlerGraphStatus}</div>}
                    <Button className="mt-3" variant="outline" onClick={fetchCrawlerOutput}>
                      Reload crawler output
                    </Button>
                  </div>
                ) : (
                  <>
                    {(() => {
                      const nodes = Array.isArray(crawlerGraph?.nodes) ? crawlerGraph.nodes : [];
                      const edges = Array.isArray(crawlerGraph?.edges) ? crawlerGraph.edges : [];
                      const nodesByUid = new Map<string, any>();
                      for (const n of nodes) nodesByUid.set(String(n?.uid ?? n?.id ?? ''), n);
                      const options = nodes
                        .map((n: any) => ({
                          uid: String(n?.uid ?? n?.id ?? ''),
                          label: String(n?.label || ''),
                        }))
                        .filter((x: any) => x.uid)
                        .sort((a: any, b: any) => a.label.localeCompare(b.label));

                      const selectedPath = selectedFlowPathIdx !== null ? flowPaths[selectedFlowPathIdx] : null;

                      return (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Start screen</Label>
                              <select
                                className="w-full h-10 rounded-md border bg-input px-3 text-sm"
                                value={flowStartUid}
                                onChange={(e) => {
                                  setFlowStartUid(e.target.value);
                                  setSelectedFlowPathIdx(null);
                                  setFlowPaths([]);
                                  setFlowPathsStatus('');
                                }}
                              >
                                <option value="">Select start…</option>
                                {options.map((o: any) => (
                                  <option key={`start-${o.uid}`} value={o.uid}>
                                    {o.label || o.uid}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label>End screen</Label>
                              <select
                                className="w-full h-10 rounded-md border bg-input px-3 text-sm"
                                value={flowEndUid}
                                onChange={(e) => {
                                  setFlowEndUid(e.target.value);
                                  setSelectedFlowPathIdx(null);
                                  setFlowPaths([]);
                                  setFlowPathsStatus('');
                                }}
                              >
                                <option value="">Select end…</option>
                                {options.map((o: any) => (
                                  <option key={`end-${o.uid}`} value={o.uid}>
                                    {o.label || o.uid}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label>Paths</Label>
                              <Button
                                className="w-full"
                                disabled={!flowStartUid || !flowEndUid}
                                onClick={() => {
                                  setFlowPathsStatus('Searching paths…');
                                  setSelectedFlowPathIdx(null);
                                  const { paths, truncated } = enumeratePathsBounded(
                                    edges.map((e: any) => ({
                                      from: String(e?.from ?? ''),
                                      to: String(e?.to ?? ''),
                                      action: String(e?.action ?? ''),
                                    })),
                                    flowStartUid,
                                    flowEndUid,
                                    50,
                                    12
                                  );
                                  setFlowPaths(paths);
                                  setFlowPathsTruncated(truncated);
                                  setFlowPathsStatus(
                                    paths.length === 0
                                      ? 'No path found (within depth 12).'
                                      : `Found ${paths.length} path(s).`
                                  );
                                }}
                              >
                                Find paths
                              </Button>
                              {flowPathsStatus && (
                                <div className="text-xs text-muted-foreground">
                                  {flowPathsStatus}
                                  {flowPathsTruncated ? ' (truncated at 50 paths)' : ''}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="border rounded-xl bg-card/40">
                            <div className="flex items-center justify-between px-4 py-3 border-b">
                              <div className="space-y-0.5">
                                <p className="text-sm font-medium">Graph</p>
                                <p className="text-xs text-muted-foreground">
                                  Hover screens to see outgoing taps. Use Start/End above to build all simple paths
                                  (max 50, depth 12).
                                </p>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {crawlerGraphLayout.nodeCount} nodes • {crawlerGraphLayout.edgeCount} edges
                                {crawlerGraphLayout.truncated ? ' • showing first 36 nodes' : ''}
                              </div>
                            </div>
                            <div className="p-3 overflow-visible">{/* reuse Step 5 graph */}</div>
                            <div className="px-3 pb-3">
                              <div className="relative">
                                {/* Reuse the same SVG graph from Step 5 by rendering it again */}
                                <svg
                                  width="100%"
                                  height={crawlerGraphLayout.height}
                                  viewBox={`0 0 ${crawlerGraphLayout.width} ${crawlerGraphLayout.height}`}
                                  className="bg-background/20 rounded-lg border w-full"
                                  onMouseMove={(e) => {
                                    const svg = e.currentTarget as SVGSVGElement;
                                    const rect = svg.getBoundingClientRect();
                                    const x = ((e.clientX - rect.left) / rect.width) * crawlerGraphLayout.width;
                                    const y = ((e.clientY - rect.top) / rect.height) * crawlerGraphLayout.height;
                                    let best: any = null;
                                    let bestD = 1e9;
                                    for (const n of crawlerGraphLayout.nodes) {
                                      const dx = n.x - x;
                                      const dy = n.y - y;
                                      const d = Math.sqrt(dx * dx + dy * dy);
                                      if (d < bestD) {
                                        bestD = d;
                                        best = n;
                                      }
                                    }
                                    if (best && bestD < 28) {
                                      setHoverNode(best);
                                      setHoverPos({ x: e.clientX, y: e.clientY });
                                    } else {
                                      setHoverNode(null);
                                      setHoverPos(null);
                                    }
                                  }}
                                  onMouseLeave={() => {
                                    setHoverNode(null);
                                    setHoverPos(null);
                                  }}
                                >
                                  <defs>
                                    <marker
                                      id="arrowOut_step8"
                                      viewBox="0 0 10 10"
                                      refX="9"
                                      refY="5"
                                      markerWidth="6"
                                      markerHeight="6"
                                      orient="auto"
                                    >
                                      <path d="M 0 1 L 10 5 L 0 9 z" fill="rgba(45,212,191,1)" />
                                    </marker>
                                    <marker
                                      id="arrowIn_step8"
                                      viewBox="0 0 10 10"
                                      refX="9"
                                      refY="5"
                                      markerWidth="6"
                                      markerHeight="6"
                                      orient="auto"
                                    >
                                      <path d="M 0 1 L 10 5 L 0 9 z" fill="rgba(168,85,247,1)" />
                                    </marker>
                                    <marker
                                      id="arrow_step8"
                                      viewBox="0 0 10 10"
                                      refX="9"
                                      refY="5"
                                      markerWidth="6"
                                      markerHeight="6"
                                      orient="auto"
                                    >
                                      <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(148,163,184,0.7)" />
                                    </marker>
                                    <filter id="softShadow_step8" x="-30%" y="-30%" width="160%" height="160%">
                                      <feDropShadow
                                        dx="0"
                                        dy="2"
                                        stdDeviation="3"
                                        floodColor="rgba(0,0,0,0.35)"
                                      />
                                    </filter>
                                    <radialGradient id="nodeGlow_step8" cx="30%" cy="30%" r="70%">
                                      <stop offset="0%" stopColor="rgba(45,212,191,0.95)" />
                                      <stop offset="100%" stopColor="rgba(20,184,166,0.25)" />
                                    </radialGradient>
                                  </defs>

                                  {crawlerGraphLayout.edges.map((ed: any, idx: number) => {
                                    const a = crawlerGraphLayout.nodes.find((n) => n.id === ed.from);
                                    const b = crawlerGraphLayout.nodes.find((n) => n.id === ed.to);
                                    if (!a || !b) return null;
                                    const isOut = hoverNode && ed.from === hoverNode.id;
                                    const isIn = hoverNode && ed.to === hoverNode.id;
                                    const stroke = isOut
                                      ? 'rgba(45,212,191,0.95)'
                                      : isIn
                                        ? 'rgba(168,85,247,0.95)'
                                        : 'rgba(148,163,184,0.55)';
                                    const marker = isOut
                                      ? 'url(#arrowOut_step8)'
                                      : isIn
                                        ? 'url(#arrowIn_step8)'
                                        : 'url(#arrow_step8)';
                                    const width = 1.6;
                                    const nodeR = 18;
                                    const trim = nodeR + 10;
                                    const mx = (a.x + b.x) / 2;
                                    const my = (a.y + b.y) / 2;
                                    const bend = 0.06;
                                    const cx = mx + (a.y - b.y) * bend;
                                    const cy = my + (b.x - a.x) * bend;
                                    const sx0 = a.x, sy0 = a.y;
                                    const ex0 = b.x, ey0 = b.y;
                                    const sdx = cx - sx0;
                                    const sdy = cy - sy0;
                                    const sl = Math.sqrt(sdx * sdx + sdy * sdy) || 1;
                                    const sx = sx0 + (sdx / sl) * trim;
                                    const sy = sy0 + (sdy / sl) * trim;
                                    const edx = ex0 - cx;
                                    const edy = ey0 - cy;
                                    const el = Math.sqrt(edx * edx + edy * edy) || 1;
                                    const ex = ex0 - (edx / el) * trim;
                                    const ey = ey0 - (edy / el) * trim;
                                    const d = `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;
                                    const actionStr = String(ed?.action || '').trim();
                                    const showEdgeLabel = Boolean(actionStr) && hoverNode && (ed.from === hoverNode.id || ed.to === hoverNode.id);
                                    const shortAction = actionStr.length > 24 ? `${actionStr.slice(0, 24)}…` : actionStr;
                                    const lx = 0.25 * sx + 0.5 * cx + 0.25 * ex;
                                    const ly = 0.25 * sy + 0.5 * cy + 0.25 * ey;
                                    return (
                                      <g key={`e8-${idx}`}>
                                        <path
                                          d={d}
                                          fill="none"
                                          stroke={stroke}
                                          strokeWidth={width}
                                          strokeLinecap="round"
                                          markerEnd={marker}
                                        />
                                        {showEdgeLabel ? (
                                          <text
                                            x={lx}
                                            y={ly}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            fill="rgba(226,232,240,0.98)"
                                            fontSize="10"
                                            fontFamily="ui-sans-serif, system-ui"
                                            paintOrder="stroke"
                                            stroke="rgba(15,23,42,0.92)"
                                            strokeWidth="3"
                                            strokeLinejoin="round"
                                          >
                                            {shortAction}
                                          </text>
                                        ) : null}
                                      </g>
                                    );
                                  })}

                                  {crawlerGraphLayout.nodes.map((n: any) => (
                                    <g key={`n8-${n.id}`} filter="url(#softShadow_step8)">
                                      <circle
                                        cx={n.x}
                                        cy={n.y}
                                        r={18}
                                        fill="url(#nodeGlow_step8)"
                                        stroke="rgba(45,212,191,0.6)"
                                        strokeWidth="1.6"
                                      />
                                      <text
                                        x={n.x}
                                        y={n.y + 36}
                                        textAnchor="middle"
                                        fill="rgba(226,232,240,0.95)"
                                        fontSize="12"
                                        fontFamily="ui-sans-serif, system-ui"
                                      >
                                        {n.label.length > 16 ? `${n.label.slice(0, 16)}…` : n.label}
                                      </text>
                                      {n.outgoingCount > 0 ? (
                                        <text
                                          x={n.x}
                                          y={n.y + 50}
                                          textAnchor="middle"
                                          fill="rgba(148,163,184,0.9)"
                                          fontSize="9"
                                          fontFamily="ui-sans-serif, system-ui"
                                        >
                                          {n.outgoingCount} tap{n.outgoingCount === 1 ? '' : 's'} recorded
                                        </text>
                                      ) : null}
                                    </g>
                                  ))}
                                </svg>

                                {hoverNode && hoverPos && typeof document !== 'undefined' && (
                                  createPortal(
                                    <div
                                      className="fixed pointer-events-none w-[22rem] max-h-[min(70vh,520px)] overflow-y-auto rounded-lg border bg-background/95 backdrop-blur p-2 shadow-xl z-[9999]"
                                      style={{
                                        left: (() => {
                                          const vv = (window as any).visualViewport;
                                          const vw = (vv?.width ?? window.innerWidth) as number;
                                          const ox = (vv?.offsetLeft ?? 0) as number;
                                          const desired = hoverPos.x + 16;
                                          const max = ox + vw - 380;
                                          const min = ox + 8;
                                          return Math.max(min, Math.min(desired, max));
                                        })(),
                                        top: (() => {
                                          const vv = (window as any).visualViewport;
                                          const vh = (vv?.height ?? window.innerHeight) as number;
                                          const oy = (vv?.offsetTop ?? 0) as number;
                                          const desired = hoverPos.y + 16;
                                          const max = oy + vh - 360;
                                          const min = oy + 8;
                                          return Math.max(min, Math.min(desired, max));
                                        })(),
                                      }}
                                    >
                                      <div className="flex items-center justify-between gap-2 mb-2">
                                        <div className="text-xs font-medium truncate">{hoverNode.label}</div>
                                      </div>
                                      {Array.isArray(hoverNode.outgoing) && hoverNode.outgoing.length > 0 && (
                                        <div>
                                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                                            Where taps go (edges)
                                          </div>
                                          <ul className="space-y-1 text-[11px] leading-snug">
                                            {hoverNode.outgoing.map(
                                              (
                                                t: { action: string; toLabel: string; sameScreen: boolean },
                                                i: number
                                              ) => (
                                                <li
                                                  key={`out8-${i}`}
                                                  className="rounded border border-border/50 bg-muted/40 px-2 py-1"
                                                >
                                                  <span className="text-teal-300 font-medium">{t.action}</span>
                                                  <span className="text-muted-foreground"> → </span>
                                                  <span className={t.sameScreen ? 'text-muted-foreground' : 'text-foreground'}>
                                                    {t.sameScreen ? `${t.toLabel} (same screen)` : t.toLabel}
                                                  </span>
                                                </li>
                                              )
                                            )}
                                          </ul>
                                        </div>
                                      )}
                                    </div>,
                                    document.body
                                  )
                                )}
                              </div>
                            </div>
                          </div>

                          {flowPaths.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-medium">Choose a path</div>
                                <div className="text-xs text-muted-foreground">
                                  {flowPaths.length} found {flowPathsTruncated ? '(truncated)' : ''}
                                </div>
                              </div>
                              <div className="grid grid-cols-1 gap-2">
                                {flowPaths.map((p, idx) => {
                                  const labels = p.nodes.map((uid) => String(nodesByUid.get(uid)?.label || uid));
                                  return (
                                    <button
                                      key={`path-${idx}`}
                                      type="button"
                                      className={`text-left rounded border px-3 py-2 bg-card/40 hover:bg-card/60 transition ${selectedFlowPathIdx === idx ? 'border-primary' : 'border-border/60'
                                        }`}
                                      onClick={() => {
                                        setSelectedFlowPathIdx(idx);
                                        prefillInputsForPath(p.nodes, nodesByUid);
                                      }}
                                    >
                                      <div className="text-xs text-muted-foreground mb-1">
                                        {p.actions.length} step{p.actions.length === 1 ? '' : 's'}
                                      </div>
                                      <div className="text-sm">
                                        <span className="font-medium">{labels[0]}</span>
                                        {p.actions.map((a, i) => (
                                          <span key={`a-${idx}-${i}`}>
                                            <span className="text-muted-foreground"> — </span>
                                            <span className="text-teal-300">{a}</span>
                                            <span className="text-muted-foreground"> → </span>
                                            <span>{labels[i + 1] || '—'}</span>
                                          </span>
                                        ))}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {selectedPath && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-sm font-medium">Inputs</div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => prefillInputsForPath(selectedPath.nodes, nodesByUid)}
                                  >
                                    Refill from Step 7 + creds
                                  </Button>
                                </div>
                                {selectedPath.nodes
                                  .filter((uid) => {
                                    const n = nodesByUid.get(uid);
                                    const inputs = Array.isArray(n?.inputs) ? n.inputs : [];
                                    return inputs.some((x: any) => String(x) && String(x) !== 'No inputs');
                                  })
                                  .map((uid) => {
                                    const n = nodesByUid.get(uid);
                                    const label = String(n?.label || uid);
                                    const fields = inputsByScreen[uid] || {};
                                    const keys = Object.keys(fields);
                                    if (keys.length === 0) return null;
                                    return (
                                      <div key={`in-${uid}`} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                                        <div className="text-sm font-medium">{label}</div>
                                        <div className="space-y-2">
                                          {keys.map((k) => (
                                            <div key={`${uid}-${k}`} className="space-y-1">
                                              <Label className="text-xs">{k}</Label>
                                              <Input
                                                value={fields[k] ?? ''}
                                                onChange={(e) => {
                                                  const v = e.target.value;
                                                  setInputsByScreen((prev) => ({
                                                    ...prev,
                                                    [uid]: { ...(prev[uid] || {}), [k]: v },
                                                  }));
                                                }}
                                                className="bg-input"
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                <div className="text-xs text-muted-foreground">
                                  If a screen needs inputs and the value is blank, Step 9 will use what you enter here.
                                </div>
                              </div>

                              <div className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-sm font-medium">Filters to check</div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setFilterSteps((prev) => [...prev, { screenUid: flowStartUid, buttonLabel: '', valueToSelect: '' }])
                                    }
                                    disabled={!flowStartUid}
                                  >
                                    Add filter step
                                  </Button>
                                </div>

                                {filterSteps.length === 0 ? (
                                  <div className="text-sm text-muted-foreground border rounded-lg p-3 bg-muted/20">
                                    No filters added. Add one if you want to open a filter UI and select a value during the
                                    run.
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {filterSteps.map((f, idx) => {
                                      const n = nodesByUid.get(f.screenUid);
                                      const btnOptions = [
                                        ...(Array.isArray(n?.functionalButtons) ? n.functionalButtons : []),
                                        ...(Array.isArray(n?.navButtons) ? n.navButtons : []),
                                      ].map((x: any) => String(x));
                                      return (
                                        <div key={`f-${idx}`} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                                          <div className="flex items-center justify-between gap-2">
                                            <div className="text-xs text-muted-foreground">Filter step #{idx + 1}</div>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => setFilterSteps((prev) => prev.filter((_, i) => i !== idx))}
                                            >
                                              Remove
                                            </Button>
                                          </div>
                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div className="space-y-1">
                                              <Label className="text-xs">Screen</Label>
                                              <select
                                                className="w-full h-10 rounded-md border bg-input px-3 text-sm"
                                                value={f.screenUid}
                                                onChange={(e) => {
                                                  const v = e.target.value;
                                                  setFilterSteps((prev) =>
                                                    prev.map((x, i) => (i === idx ? { ...x, screenUid: v, buttonLabel: '' } : x))
                                                  );
                                                }}
                                              >
                                                <option value="">Select…</option>
                                                {options.map((o: any) => (
                                                  <option key={`fs-${idx}-${o.uid}`} value={o.uid}>
                                                    {o.label || o.uid}
                                                  </option>
                                                ))}
                                              </select>
                                            </div>
                                            <div className="space-y-1">
                                              <Label className="text-xs">Filter button label</Label>
                                              <Input
                                                list={`btns-${idx}`}
                                                value={f.buttonLabel}
                                                onChange={(e) => {
                                                  const v = e.target.value;
                                                  setFilterSteps((prev) => prev.map((x, i) => (i === idx ? { ...x, buttonLabel: v } : x)));
                                                }}
                                                className="bg-input"
                                              />
                                              <datalist id={`btns-${idx}`}>
                                                {btnOptions.slice(0, 80).map((b: string, i: number) => (
                                                  <option key={`bo-${idx}-${i}`} value={b} />
                                                ))}
                                              </datalist>
                                            </div>
                                            <div className="space-y-1">
                                              <Label className="text-xs">Value to select</Label>
                                              <Input
                                                value={f.valueToSelect}
                                                onChange={(e) => {
                                                  const v = e.target.value;
                                                  setFilterSteps((prev) =>
                                                    prev.map((x, i) => (i === idx ? { ...x, valueToSelect: v } : x))
                                                  );
                                                }}
                                                className="bg-input"
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                <Button
                                  className="w-full"
                                  disabled={selectedFlowPathIdx === null || !flowStartUid || !flowEndUid}
                                  onClick={() => setCurrentStep(9)}
                                >
                                  Next: Run flow
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 9: Run selected flow */}
          {currentStep === 9 && (
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="text-primary" size={24} />
                  Run flow
                </CardTitle>
                <CardDescription>
                  Runs the emulator + Appium runner following the selected path, applying your inputs and filter steps.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-muted/20 p-3 text-sm space-y-2">
                  <div>
                    <span className="text-muted-foreground">Start UID:</span>{' '}
                    <span className="font-mono text-xs">{flowStartUid || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">End UID:</span>{' '}
                    <span className="font-mono text-xs">{flowEndUid || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Path:</span>{' '}
                    {selectedFlowPathIdx === null ? '—' : `${flowPaths[selectedFlowPathIdx]?.actions?.length || 0} steps`}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Filters:</span> {filterSteps.length}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                  <Button variant="outline" onClick={() => setCurrentStep(8)}>
                    Back
                  </Button>
                  <Button variant="secondary" onClick={() => setCurrentStep(10)}>
                    View results
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={!flowStartUid || !flowEndUid || selectedFlowPathIdx === null || isRunningFlow}
                    onClick={async () => {
                      setIsRunningFlow(true);
                      setRunFlowStatus('Starting flow…');
                      setRunFlowLog('');
                      setRunFlowPid(null);
                      try {
                        const selected = selectedFlowPathIdx !== null ? flowPaths[selectedFlowPathIdx] : null;
                        const payload = {
                          appId: appId.trim() || null,
                          startUid: flowStartUid,
                          endUid: flowEndUid,
                          pathUids: selected ? selected.nodes : [],
                          inputsByScreen,
                          filters: filterSteps,
                          logsType: 'video',
                        };
                        const r = await fetch(`${API_BASE}/api/appium/run-userflow`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(payload),
                        });
                        const d = await r.json().catch(() => ({}));
                        if (!r.ok) {
                          setRunFlowStatus(d.error || d.detail || r.statusText || 'Failed to start flow');
                          return;
                        }
                        if (d?.pid) setRunFlowPid(Number(d.pid));
                        if (d?.requestId) setLastRunFlowRequestId(String(d.requestId));
                        setRunFlowStatus(d?.status || 'Started.');
                      } catch (err) {
                        setRunFlowStatus(err instanceof Error ? err.message : String(err));
                      } finally {
                        setIsRunningFlow(false);
                      }
                    }}
                  >
                    {isRunningFlow ? 'Starting…' : 'Run selected flow'}
                  </Button>
                </div>

                {runFlowStatus && <div className={`p-4 border rounded ${getNoticeClasses(runFlowStatus)}`}>{runFlowStatus}</div>}
                {runFlowPid !== null && (
                  <div className="text-xs text-muted-foreground">
                    Runner PID: <span className="font-mono">{runFlowPid}</span>
                  </div>
                )}

                {runFlowLog && (
                  <pre className="text-xs whitespace-pre-wrap p-3 border rounded bg-muted/30 max-h-[360px] overflow-auto">
                    {runFlowLog}
                  </pre>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 10: Run results (videos + log) */}
          {currentStep === 10 && (
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clapperboard className="text-primary" size={24} />
                  Run results
                </CardTitle>
                <CardDescription>
                  Screen recordings from user-flow runs and the latest lines from the runner log. New videos appear when a run finishes with recording enabled.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button variant="outline" onClick={() => setCurrentStep(9)}>
                    Back to run
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      fetchUserflowVideos();
                      fetchUserflowLog();
                      fetchUserflowResult();
                    }}
                  >
                    Refresh
                  </Button>
                </div>

                {lastRunFlowRequestId && (
                  <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-medium">Run summary</div>
                      {userflowResult?.ok === true && (
                        <span className="text-xs px-2 py-0.5 rounded-full border bg-primary/10 text-primary">Passed</span>
                      )}
                      {userflowResult?.ok === false && (
                        <span className="text-xs px-2 py-0.5 rounded-full border bg-destructive/10 text-destructive">Failed</span>
                      )}
                      {userflowResult == null && (
                        <span className="text-xs text-muted-foreground">Running… results will appear here</span>
                      )}
                    </div>
                    {userflowResult && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="rounded-md border bg-background/30 px-3 py-2">
                          <div className="text-[11px] text-muted-foreground">Steps passed</div>
                          <div className="text-sm font-semibold">
                            {userflowResult?.stepSummary?.passed ?? 0}/{userflowResult?.stepSummary?.total ?? 0}
                          </div>
                        </div>
                        <div className="rounded-md border bg-background/30 px-3 py-2">
                          <div className="text-[11px] text-muted-foreground">Reached the destination</div>
                          <div className="text-sm font-semibold">{userflowResult?.reachedEnd ? 'Yes' : 'No'}</div>
                        </div>
                        <div className="rounded-md border bg-background/30 px-3 py-2">
                          <div className="text-[11px] text-muted-foreground">Recording</div>
                          <div className="text-sm font-semibold">
                            {userflowResult?.logsType ? 'On' : 'Off'}
                          </div>
                        </div>
                      </div>
                    )}
                    {userflowResult?.fatalError && (
                      <div className="rounded-md border bg-destructive/10 text-destructive px-3 py-2 text-sm whitespace-pre-wrap">
                        {String(userflowResult.fatalError)}
                      </div>
                    )}
                  </div>
                )}

                {userflowResult?.steps?.length > 0 && (
                  <div className="rounded-lg border bg-card/40 p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="text-sm font-medium">What the run did</div>
                      <div className="text-xs text-muted-foreground">
                        {userflowResult?.stepSummary?.passed ?? 0}/{userflowResult?.stepSummary?.total ?? userflowResult.steps.length} passed
                      </div>
                    </div>
                    <div className="max-h-[280px] overflow-auto space-y-2">
                      {userflowResult.steps.map((s: any) => (
                        <div key={`rs-${s.i}-${s.uid}`} className="rounded border px-3 py-2 bg-muted/20">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-medium truncate">
                              Step {s.i}: {s.label || 'Screen'}
                            </div>
                            <div className={`text-xs font-medium ${s.ok ? 'text-primary' : 'text-destructive'}`}>
                              {s.ok ? 'Passed' : 'Failed'}
                            </div>
                          </div>
                          {s.button && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Tapped: <span className="text-foreground/90">{s.button}</span>
                            </div>
                          )}
                          {!s.ok && s.error && (
                            <div className="text-sm text-destructive mt-1 whitespace-pre-wrap">{String(s.error)}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                  <span className="text-muted-foreground">
                    Tip: open the video below to visually confirm each step.
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Recording</h3>
                  {(() => {
                    if (!lastRunFlowRequestId) {
                      return (
                        <p className="text-sm text-muted-foreground">
                          Run a flow first to generate a recording.
                        </p>
                      );
                    }

                    const items = Array.isArray(userflowVideoItems) ? userflowVideoItems : [];
                    const filtered = items.filter((v) =>
                      String(v?.name || '').includes(`userflow_${lastRunFlowRequestId}`)
                    );
                    const latest = filtered[0] || null;
                    if (!latest) {
                      return (
                        <p className="text-sm text-muted-foreground">
                          No recording found for the latest run yet. Wait for the run to finish, then refresh.
                        </p>
                      );
                    }

                    const fullUrl = `${API_BASE}${latest.url}`;
                    return (
                      <div className="rounded-lg border p-3 space-y-2 ring-2 ring-primary/30 bg-primary/5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono text-xs break-all">{latest.name}</span>
                          <a
                            className="text-xs text-primary underline shrink-0"
                            href={fullUrl}
                            download={latest.name}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open / download
                          </a>
                        </div>
                        <video
                          className="w-full max-h-[420px] rounded-md bg-black"
                          controls
                          preload="metadata"
                          src={fullUrl}
                        />
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Userflow log</h3>
                  {runFlowLog ? (
                    <pre className="text-xs whitespace-pre-wrap p-3 border rounded bg-muted/30 max-h-[320px] overflow-auto">
                      {runFlowLog}
                    </pre>
                  ) : (
                    <p className="text-sm text-muted-foreground">No log lines loaded yet.</p>
                  )}
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
