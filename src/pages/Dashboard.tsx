import { useEffect, useState, useRef, useCallback } from "react";
import { ref, onValue, set } from "firebase/database";
import { signOut } from "firebase/auth";
import { database, auth } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Thermometer,
  Droplets,
  AlertTriangle,
  Power,
  Fish,
  Wifi,
  WifiOff,
  LogOut,
  Clock,
} from "lucide-react";

interface AquariumData {
  temperature: number;
  ph: number;
  alert: string;
  pumpStatus: string;
}

const Dashboard = () => {
  const [data, setData] = useState<AquariumData | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const prevAlertRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const navigate = useNavigate();

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Firebase connection status
  useEffect(() => {
    const connRef = ref(database, ".info/connected");
    const unsub = onValue(connRef, (snap) => {
      setConnected(snap.val() === true);
    });
    return () => unsub();
  }, []);

  const triggerNotifications = useCallback((alertValue: string) => {
    // Toast
    const isWarning = alertValue === "WARNING";
    toast.error(`🚨 Alert: ${alertValue}`, {
      description: `Aquarium alert status changed to ${alertValue}`,
      duration: 6000,
    });

    // Sound
    try {
      if (!audioRef.current) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = isWarning ? 600 : 900;
        gain.gain.value = 0.15;
        osc.start();
        setTimeout(() => {
          osc.stop();
          ctx.close();
        }, 300);
      }
    } catch {}

    // Browser notification
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Smart Fisheries Alert", {
        body: `Alert status: ${alertValue}`,
        icon: "/favicon.ico",
      });
    }
  }, []);

  // Listen to aquarium data
  useEffect(() => {
    const aquariumRef = ref(database, "aquarium");
    const unsub = onValue(
      aquariumRef,
      (snapshot) => {
        const val = snapshot.val();
        if (val) {
          setData(val);
          setLastUpdated(new Date());
          setLoading(false);

          // Check alert change
          if (
            prevAlertRef.current !== null &&
            val.alert !== prevAlertRef.current &&
            val.alert !== "NORMAL"
          ) {
            triggerNotifications(val.alert);
          }
          prevAlertRef.current = val.alert;
        } else {
          setLoading(false);
        }
      },
      (error) => {
        toast.error("Database error: " + error.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [triggerNotifications]);

  const handlePumpToggle = async () => {
    if (!data) return;
    const newStatus = data.pumpStatus === "ON" ? "OFF" : "ON";
    try {
      await set(ref(database, "aquarium/pumpStatus"), newStatus);
    } catch (err: any) {
      toast.error("Failed to update pump: " + err.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const tempInRange = data ? data.temperature >= 20 && data.temperature <= 30 : true;
  const phInRange = data ? data.ph >= 6.5 && data.ph <= 8.5 : true;
  const alertLevel = data?.alert || "NORMAL";
  const isAlertGlow = alertLevel === "CRITICAL" ? "animate-glow-alert" : alertLevel === "WARNING" ? "animate-glow-warning" : "";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Connecting to sensors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-ocean flex items-center justify-center">
              <Fish className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground leading-tight">Smart Fisheries</h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  {connected ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-success inline-block" />
                      <Wifi className="w-3 h-3" /> Connected
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-destructive inline-block" />
                      <WifiOff className="w-3 h-3" /> Disconnected
                    </>
                  )}
                </span>
                {lastUpdated && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Dashboard */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {!data ? (
          <div className="text-center py-12 text-muted-foreground">
            No data available. Check your database connection.
          </div>
        ) : (
          <>
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Temperature */}
              <div className="bg-card rounded-2xl shadow-card p-6 border border-border hover:shadow-card-hover transition-shadow animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-muted-foreground">Temperature</span>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tempInRange ? "bg-success/10" : "bg-destructive/10"}`}>
                    <Thermometer className={`w-5 h-5 ${tempInRange ? "text-success" : "text-destructive"}`} />
                  </div>
                </div>
                <div className="flex items-end gap-1">
                  <span className={`text-4xl font-bold font-mono ${tempInRange ? "text-success" : "text-destructive"}`}>
                    {data.temperature}
                  </span>
                  <span className="text-lg text-muted-foreground mb-1">°C</span>
                </div>
                <p className={`text-xs mt-2 ${tempInRange ? "text-success" : "text-destructive"}`}>
                  {tempInRange ? "Within safe range (20–30°C)" : "Outside safe range!"}
                </p>
              </div>

              {/* pH */}
              <div className="bg-card rounded-2xl shadow-card p-6 border border-border hover:shadow-card-hover transition-shadow animate-fade-in" style={{ animationDelay: "0.1s" }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-muted-foreground">pH Level</span>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${phInRange ? "bg-success/10" : "bg-destructive/10"}`}>
                    <Droplets className={`w-5 h-5 ${phInRange ? "text-success" : "text-destructive"}`} />
                  </div>
                </div>
                <div className="flex items-end gap-1">
                  <span className={`text-4xl font-bold font-mono ${phInRange ? "text-success" : "text-destructive"}`}>
                    {data.ph}
                  </span>
                </div>
                <p className={`text-xs mt-2 ${phInRange ? "text-success" : "text-destructive"}`}>
                  {phInRange ? "Within safe range (6.5–8.5)" : "Outside safe range!"}
                </p>
              </div>

              {/* Alert */}
              <div className={`bg-card rounded-2xl shadow-card p-6 border border-border hover:shadow-card-hover transition-shadow animate-fade-in ${isAlertGlow}`} style={{ animationDelay: "0.2s" }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-muted-foreground">System Alert</span>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    alertLevel === "NORMAL" ? "bg-success/10" : alertLevel === "WARNING" ? "bg-warning/10" : "bg-destructive/10"
                  }`}>
                    <AlertTriangle className={`w-5 h-5 ${
                      alertLevel === "NORMAL" ? "text-success" : alertLevel === "WARNING" ? "text-warning" : "text-destructive"
                    }`} />
                  </div>
                </div>
                <div>
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${
                    alertLevel === "NORMAL"
                      ? "bg-success/15 text-success"
                      : alertLevel === "WARNING"
                      ? "bg-warning/15 text-warning"
                      : "bg-destructive/15 text-destructive"
                  }`}>
                    {alertLevel}
                  </span>
                </div>
                <p className="text-xs mt-3 text-muted-foreground">
                  {alertLevel === "NORMAL" ? "All systems operating normally" : "Attention required"}
                </p>
              </div>
            </div>

            {/* Pump Control */}
            <div className="bg-card rounded-2xl shadow-card p-6 border border-border animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${data.pumpStatus === "ON" ? "bg-success/10" : "bg-muted"}`}>
                    <Power className={`w-6 h-6 ${data.pumpStatus === "ON" ? "text-success" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Water Pump</h3>
                    <p className="text-sm text-muted-foreground">
                      Status: <span className={`font-mono font-semibold ${data.pumpStatus === "ON" ? "text-success" : "text-muted-foreground"}`}>{data.pumpStatus}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={handlePumpToggle}
                  className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${
                    data.pumpStatus === "ON" ? "bg-success" : "bg-muted"
                  }`}
                  aria-label="Toggle pump"
                >
                  <span
                    className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-card shadow-md transition-transform duration-300 ${
                      data.pumpStatus === "ON" ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
