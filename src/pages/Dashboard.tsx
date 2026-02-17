import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Sparkles, Database, Shield, Zap, UploadCloud, Brain, TestTube, Settings } from 'lucide-react';
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
  
  // Classification states
  const [useCustomThreshold, setUseCustomThreshold] = useState(false);
  const [threshold, setThreshold] = useState([0.5]);
  const [isClassifying, setIsClassifying] = useState(false);
  const [classificationStatus, setClassificationStatus] = useState('');
  const [classificationStats, setClassificationStats] = useState<any>(null);
  
  // Test case generation states
  const [isGeneratingTestCases, setIsGeneratingTestCases] = useState(false);
  const [testCaseStatus, setTestCaseStatus] = useState('');
  const [testCaseStats, setTestCaseStats] = useState<any>(null);
  const [batchSize, setBatchSize] = useState(10);

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

  const handleClassifyReviews = async () => {
    if (!appId.trim()) {
      setClassificationStatus('Please enter an App ID');
      return;
    }
    
    setIsClassifying(true);
    setClassificationStatus('Classifying reviews...');
    
    try {
      const selectedThreshold = useCustomThreshold ? threshold[0] : undefined;
      const url = `/api/classification/classify-reviews?appId=${encodeURIComponent(appId)}${selectedThreshold !== undefined ? `&threshold=${selectedThreshold}` : ''}`;
      
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: 'Unknown error' }));
        setClassificationStatus(`Error: ${errorData.detail || res.statusText}`);
      } else {
        const data = await res.json();
        setClassificationStats(data);
        setClassificationStatus(`Success! Processed ${data.processed} reviews.`);
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
      const url = `/api/test-cases/generate-batch?appId=${encodeURIComponent(appId)}&batch_size=${batchSize}`;
      
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
      // Fetch classification stats
      const classifyRes = await fetch(`/api/classification/stats?appId=${encodeURIComponent(appId)}`);
      if (classifyRes.ok) {
        const classifyData = await classifyRes.json();
        setClassificationStats(classifyData);
      }
      
      // Fetch test case stats
      const testCaseRes = await fetch(`/api/test-cases/stats?appId=${encodeURIComponent(appId)}`);
      if (testCaseRes.ok) {
        const testCaseData = await testCaseRes.json();
        setTestCaseStats(testCaseData);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    if (appId.trim()) {
      fetchStats();
    }
  }, [appId]);

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

          <Tabs defaultValue="scrape" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="scrape">Scrape</TabsTrigger>
              <TabsTrigger value="classify">Classify</TabsTrigger>
              <TabsTrigger value="testcases">Test Cases</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="scrape" className="mt-6">
              <div className="grid gap-6">
                {/* Scrape Reviews Section */}
                <div className="bg-card border border-border p-8 holo-card">
                  <h2 className="text-2xl font-bold mb-2">Scrape Reviews</h2>
                  <p className="text-muted-foreground mb-6">
                    Enter an App ID to start scraping and analyzing reviews. APK upload is optional.
                  </p>

                  <div className="space-y-4 max-w-md">
                    <div className="space-y-2">
                      <Label htmlFor="appId">App ID</Label>
                      <Input
                        id="appId"
                        type="text"
                        placeholder="com.example.app"
                        value={appId}
                        onChange={(e) => {
                          const sanitized = DOMPurify.sanitize(e.target.value);
                          setAppId(sanitized);
                        }}
                        className="bg-input border-border"
                        disabled={isScraping}
                      />
                    </div>

                    <Button
                      onClick={handleScrape}
                      disabled={isScraping || !appId.trim()}
                      className="bg-primary text-primary-foreground hover:bg-secondary w-full"
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

                {/* Upload APK Section (Optional) */}
                <div className="bg-card border border-border p-8 holo-card">
                  <h3 className="text-xl font-bold mb-2">Upload APK (Optional)</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    APK upload is optional. You can scrape reviews with just the App ID.
                  </p>
                  <div className="flex flex-col items-center justify-center min-h-[200px]">
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
              </div>
            </TabsContent>

            <TabsContent value="classify" className="mt-6">
              <Card>
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
                    <Label htmlFor="classifyAppId">App ID</Label>
                    <Input
                      id="classifyAppId"
                      type="text"
                      placeholder="com.example.app"
                      value={appId}
                      onChange={(e) => {
                        const sanitized = DOMPurify.sanitize(e.target.value);
                        setAppId(sanitized);
                      }}
                      className="bg-input border-border"
                      disabled={isClassifying}
                    />
                  </div>

                  <div className="space-y-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="custom-threshold">Use Custom Threshold</Label>
                        <p className="text-sm text-muted-foreground">
                          Higher threshold = more strict grouping (default: 0.5)
                        </p>
                      </div>
                      <Switch
                        id="custom-threshold"
                        checked={useCustomThreshold}
                        onCheckedChange={setUseCustomThreshold}
                      />
                    </div>

                    {useCustomThreshold && (
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                          <Label>Threshold: {threshold[0].toFixed(2)}</Label>
                          <span className="text-sm text-muted-foreground">
                            {threshold[0] < 0.2 ? 'Very Loose' : threshold[0] < 0.4 ? 'Moderate' : threshold[0] < 0.6 ? 'Strict' : 'Very Strict'}
                          </span>
                        </div>
                        <Slider
                          value={threshold}
                          onValueChange={setThreshold}
                          min={0}
                          max={1}
                          step={0.01}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>0.0 (Loose)</span>
                          <span>0.5</span>
                          <span>1.0 (Strict)</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleClassifyReviews}
                    disabled={isClassifying || !appId.trim()}
                    className="w-full bg-primary text-primary-foreground hover:bg-secondary"
                  >
                    {isClassifying ? 'Classifying...' : 'Classify Reviews'}
                  </Button>

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
                        {classificationStats.processed !== undefined && (
                          <div>Processed: <strong>{classificationStats.processed}</strong></div>
                        )}
                        {classificationStats.skipped !== undefined && (
                          <div>Skipped: <strong>{classificationStats.skipped}</strong></div>
                        )}
                        {classificationStats.errors !== undefined && (
                          <div>Errors: <strong>{classificationStats.errors}</strong></div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="testcases" className="mt-6">
              <Card>
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
                    <Label htmlFor="testCaseAppId">App ID</Label>
                    <Input
                      id="testCaseAppId"
                      type="text"
                      placeholder="com.example.app"
                      value={appId}
                      onChange={(e) => {
                        const sanitized = DOMPurify.sanitize(e.target.value);
                        setAppId(sanitized);
                      }}
                      className="bg-input border-border"
                      disabled={isGeneratingTestCases}
                    />
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
                    <p className="text-sm text-muted-foreground">
                      Number of reviews to process at once (1-50)
                    </p>
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
                        {testCaseStats.processed !== undefined && (
                          <div>Processed: <strong>{testCaseStats.processed}</strong></div>
                        )}
                        {testCaseStats.failed !== undefined && (
                          <div>Failed: <strong>{testCaseStats.failed}</strong></div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="mt-6">
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
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Default Threshold: 0.5</Label>
                      <p className="text-sm text-muted-foreground">
                        The default threshold (0.5) provides a good balance between grouping similar reviews
                        and maintaining classification accuracy. You can override this in the Classification tab.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Threshold Guide</Label>
                      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                        <li><strong>0.0 - 0.2:</strong> Very loose grouping (more labels per review)</li>
                        <li><strong>0.2 - 0.4:</strong> Moderate grouping</li>
                        <li><strong>0.4 - 0.6:</strong> Strict grouping (recommended, default: 0.5)</li>
                        <li><strong>0.6 - 1.0:</strong> Very strict (only high-confidence labels)</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

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
