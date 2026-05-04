import React, { useEffect, useState, useRef } from "react";
import Web3 from "web3";
// Importation des icônes professionnelles
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  Zap, 
  ArrowRight, 
  ShieldAlert, 
  Database,
  RefreshCcw
} from "lucide-react";

const INFURA_ID = process.env.REACT_APP_INFURA_ID;
const INFURA_WSS = `wss://mainnet.infura.io/ws/v3/${INFURA_ID}`;

function App() {
  const [transactions, setTransactions] = useState([]);
  const [connected, setConnected] = useState(false);
  const [totalIntercepted, setTotalIntercepted] = useState(0);
  const [gasPrice, setGasPrice] = useState("...");
  const [errorCount, setErrorCount] = useState(0);

  const transactionsRef = useRef([]);

  useEffect(() => {
    let provider;
    let web3;
    let subscription;
    let gasInterval;

    const connectBlockchain = () => {
      provider = new Web3.providers.WebsocketProvider(INFURA_WSS, {
        reconnect: { auto: true, delay: 5000, maxAttempts: 5, onTimeout: false }
      });

      web3 = new Web3(provider);

      provider.on("connect", () => {
        setConnected(true);
      });

      provider.on("error", (e) => {
        setConnected(false);
        setErrorCount(prev => prev + 1);
      });

      provider.on("end", () => setConnected(false));

      const fetchGas = async () => {
        try {
          const price = await web3.eth.getGasPrice();
          const gwei = web3.utils.fromWei(price, 'gwei');
          setGasPrice(Math.round(gwei));
        } catch (e) {}
      };
      
      fetchGas();
      gasInterval = setInterval(fetchGas, 20000);

      const startSubscription = async () => {
        try {
          subscription = await web3.eth.subscribe("pendingTransactions");
          subscription.on("data", async (hash) => {
            setTotalIntercepted(prev => prev + 1);
            try {
              const tx = await web3.eth.getTransaction(hash);
              if (tx && tx.from) {
                const newTx = {
                  hash: tx.hash,
                  from: tx.from,
                  to: tx.to || "Contract Creation",
                  value: web3.utils.fromWei(tx.value || "0", "ether"),
                  time: new Date().toLocaleTimeString(),
                  isWhale: parseFloat(web3.utils.fromWei(tx.value || "0", "ether")) >= 1
                };
                const updatedList = [newTx, ...transactionsRef.current].slice(0, 15);
                transactionsRef.current = updatedList;
                setTransactions(updatedList);
              }
            } catch (err) {}
          });
        } catch (error) {}
      };

      startSubscription();
    };

    connectBlockchain();
    return () => {
      if (provider) provider.disconnect();
      if (gasInterval) clearInterval(gasInterval);
    };
  }, []);

  return (
    <div style={styles.container}>
      {/* --- HEADER --- */}
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <Activity size={32} color="#38bdf8" />
          <h1 style={styles.title}>Ethereum Pulse Explorer</h1>
        </div>
        <p style={styles.subtitle}>
          INPTIC 2026 | Spécialisation Génie Informatique | <strong>Marc Essone</strong>
        </p>

        <div style={styles.statsBar}>
          <div style={styles.statCard}>
            {connected ? <Wifi size={16} color="#4ade80" /> : <WifiOff size={16} color="#f87171" />}
            <span style={{ color: connected ? '#4ade80' : '#f87171', fontWeight: '600' }}>
              {connected ? "LIVE" : "OFFLINE"}
            </span>
          </div>
          
          <div style={styles.statCard}>
            <Zap size={16} color="#fbbf24" />
            <span>Gas: <strong style={{ color: '#fbbf24' }}>{gasPrice} Gwei</strong></span>
          </div>

          <div style={styles.statCard}>
            <Database size={16} color="#818cf8" />
            <span>Interceptées: <strong>{totalIntercepted}</strong></span>
          </div>

          {errorCount > 0 && (
            <div style={{ ...styles.statCard, borderColor: '#ef4444' }}>
              <RefreshCcw size={16} color="#ef4444" />
              <span style={{ color: '#ef4444' }}>Recours: {errorCount}</span>
            </div>
          )}
        </div>
      </header>

      {/* --- FLUX DE TRANSACTIONS --- */}
      <main style={styles.main}>
        {transactions.length === 0 ? (
          <div style={styles.loader}>
             <div className="spinner"></div>
             <p>Initialisation du tunnel WebSocket...</p>
          </div>
        ) : (
          transactions.map((tx) => (
            <div key={tx.hash} style={{
              ...styles.txCard,
              borderLeft: tx.isWhale ? '6px solid #fbbf24' : '6px solid #38bdf8',
            }}>
              {tx.isWhale && (
                <div style={styles.whaleBadge}>
                  <ShieldAlert size={12} style={{ marginRight: '4px' }} />
                  WHALE ALERT
                </div>
              )}
              
              <div style={styles.txRow}>
                <span style={styles.time}>{tx.time}</span>
                <span style={{
                  ...styles.value,
                  color: tx.isWhale ? '#fbbf24' : '#38bdf8'
                }}>
                  {parseFloat(tx.value) > 0 ? `${parseFloat(tx.value).toFixed(4)} ETH` : "⛽ Gas Fee Only"}
                </span>
              </div>

              <div style={styles.hash}>ID: {tx.hash}</div>

              <div style={styles.addressBox}>
                <div style={styles.addressItem}>
                  <small style={styles.addressLabel}>FROM</small>
                  <code>{tx.from.substring(0, 18)}...</code>
                </div>
                <ArrowRight size={16} color="#475569" />
                <div style={styles.addressItem}>
                  <small style={styles.addressLabel}>TO</small>
                  <code>{tx.to.substring(0, 18)}...</code>
                </div>
              </div>
            </div>
          ))
        )}
      </main>

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .spinner { width: 30px; height: 30px; border: 3px solid #1e293b; border-top: 3px solid #38bdf8; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const styles = {
  container: { backgroundColor: '#020617', minHeight: '100vh', color: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif', padding: '40px 20px' },
  header: { textAlign: 'center', marginBottom: '40px' },
  title: { fontSize: '2.4rem', margin: 0, background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '800' },
  subtitle: { color: '#64748b', fontSize: '0.95rem', marginTop: '8px' },
  statsBar: { display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '24px', flexWrap: 'wrap' },
  statCard: { background: '#0f172a', padding: '8px 16px', borderRadius: '12px', fontSize: '0.85rem', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '8px' },
  main: { maxWidth: '800px', margin: '0 auto' },
  loader: { textAlign: 'center', marginTop: '100px', color: '#64748b' },
  txCard: { background: '#0f172a', padding: '20px', borderRadius: '16px', marginBottom: '16px', border: '1px solid #1e293b', position: 'relative', animation: 'slideIn 0.3s ease-out' },
  whaleBadge: { position: 'absolute', top: '-10px', right: '20px', background: '#fbbf24', color: '#000', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '900', display: 'flex', alignItems: 'center' },
  txRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  time: { color: '#64748b', fontSize: '0.8rem', fontWeight: '500' },
  value: { fontWeight: '800', fontSize: '1.2rem', letterSpacing: '-0.5px' },
  hash: { fontSize: '0.75rem', color: '#475569', marginBottom: '16px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' },
  addressBox: { display: 'flex', alignItems: 'center', gap: '15px', background: '#020617', padding: '12px', borderRadius: '12px', border: '1px solid #1e293b' },
  addressItem: { flex: 1, display: 'flex', flexDirection: 'column' },
  addressLabel: { color: '#475569', fontSize: '0.65rem', fontWeight: 'bold', marginBottom: '4px', letterSpacing: '1px' }
};

export default App;