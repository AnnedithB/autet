import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Sparkles, Database, Shield, Zap } from 'lucide-react';

const Dashboard = () => {
  const [appId, setAppId] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [status, setStatus] = useState('');

  const handleScrape = async () => {
    if (!appId.trim()) {
      setStatus('Please enter an App ID');
      return;
    }
    setIsScraping(true);
    setStatus('Submitting...');

    try {
      // Send request to backend endpoint with the entered App ID
      const url = `/api/submit-appId/${encodeURIComponent(appId)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        // body is optional since appId is in the URL, but include for completeness
        body: JSON.stringify({ appId })
      });

      if (!res.ok) {
        const text = await res.text();
        setStatus(`Error: ${res.status} ${text}`);
      } else {
        // backend accepted the request
        setStatus('Submitted successfully. Processing started.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(`Network error: ${msg}`);
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
            <div className="bg-card border border-border p-6">
              <Sparkles className="text-primary mb-3" size={24} />
              <h3 className="text-2xl font-bold mb-1">0</h3>
              <p className="text-sm text-muted-foreground">Reviews Scraped</p>
            </div>
            <div className="bg-card border border-border p-6">
              <Database className="text-secondary mb-3" size={24} />
              <h3 className="text-2xl font-bold mb-1">0</h3>
              <p className="text-sm text-muted-foreground">Apps Tracked</p>
            </div>
            <div className="bg-card border border-border p-6">
              <Shield className="text-accent mb-3" size={24} />
              <h3 className="text-2xl font-bold mb-1">Active</h3>
              <p className="text-sm text-muted-foreground">Account Status</p>
            </div>
            <div className="bg-card border border-border p-6">
              <Zap className="text-primary mb-3" size={24} />
              <h3 className="text-2xl font-bold mb-1">Ready</h3>
              <p className="text-sm text-muted-foreground">System Status</p>
            </div>
          </div>

          {/* Scrape Reviews Section */}
          <div className="bg-card border border-border p-8">
            <h2 className="text-2xl font-bold mb-2">Scrape Reviews</h2>
            <p className="text-muted-foreground mb-6">
              Enter an App ID to start scraping and analyzing reviews
            </p>

            <div className="max-w-2xl">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="appId">App ID</Label>
                  <Input
                    id="appId"
                    type="text"
                    placeholder="com.example.app"
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
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

                {status && (
                  <div className={`p-4 border ${
                    status.includes('success') || status.includes('Completed')
                      ? 'bg-primary/10 border-primary text-primary'
                      : status.includes('Please')
                      ? 'bg-destructive/10 border-destructive text-destructive'
                      : 'bg-muted border-border text-foreground'
                  }`}>
                    {status}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            <div className="bg-card border border-border p-6 hover:border-primary transition-colors cursor-pointer">
              <h3 className="font-semibold mb-2">Overview</h3>
              <p className="text-sm text-muted-foreground">View your analytics dashboard</p>
            </div>
            <div className="bg-card border border-border p-6 hover:border-primary transition-colors cursor-pointer">
              <h3 className="font-semibold mb-2">Settings</h3>
              <p className="text-sm text-muted-foreground">Manage your account preferences</p>
            </div>
            <div className="bg-card border border-border p-6 hover:border-primary transition-colors cursor-pointer">
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
