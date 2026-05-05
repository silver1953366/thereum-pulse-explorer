import React, { useEffect, useState, useRef } from "react";
import Web3 from "web3";
import { 
  Activity, Wifi, Zap, ArrowRight, 
  ShieldAlert, Database, Terminal, Layers 
} from "lucide-react";

const INFURA_ID = process.env.REACT_APP_INFURA_ID;
// Utilisation de HTTPS pour une stabilité maximale sur les réseaux restreints
const INFURA_HTTP = `https://mainnet.infura.io/v3/${INFURA_ID}`;

function App() {
  const [transactions, setTransactions] = useState([]);
  const [connected, setConnected] = useState(false);
  const [totalIntercepted, setTotalIntercepted] = useState(0);
  const [gasPrice, setGasPrice] = useState("...");
  const [lastBlock, setLastBlock] = useState(0);
  const [lastError, setLastError] = useState(null);

  useEffect(() => {
    let web3;
    let mainInterval;
    let isMounted = true;

    const initBlockchain = async () => {
      try {
        if (!INFURA_ID) {
          setLastError("Clé API manquante dans le fichier .env");
          return;
        }

        const provider = new Web3.providers.HttpProvider(INFURA_HTTP);
        web3 = new Web3(provider);
        
        await web3.eth.getBlockNumber();
        if (isMounted) {
          setConnected(true);
          setLastError(null);
          console.log("✅ Connexion stable établie avec Infura");
        }

        const updateData = async () => {
          if (!isMounted) return;
          try {
            // 1. Récupération du Gas avec haute précision
            const price = await web3.eth.getGasPrice();
            const gwei = web3.utils.fromWei(price, 'gwei');

            // Correction : On affiche les décimales si le gas est très bas (< 1 Gwei)
            const formattedGas = parseFloat(gwei) < 1 
              ? parseFloat(gwei).toFixed(3) 
              : Math.round(gwei);

            setGasPrice(formattedGas);

            // 2. Récupération du dernier bloc et des transactions
            const blockNum = await web3.eth.getBlockNumber();
            setLastBlock(Number(blockNum));

            const block = await web3.eth.getBlock(blockNum, true);
            
            if (block && block.transactions && block.transactions.length > 0) {
              const newTxs = block.transactions.slice(0, 10).map(tx => ({
                hash: tx.hash,
                from: tx.from,
                to: tx.to || "Contrat Déployé",
                value: web3.utils.fromWei(tx.value || "0", "ether"),
                time: new Date().toLocaleTimeString(),
                isWhale: parseFloat(web3.utils.fromWei(tx.value || "0", "ether")) >= 0.5
              }));

              setTransactions(prev => {
                const combined = [...newTxs, ...prev];
                // Filtrage des doublons par Hash unique
                return Array.from(new Map(combined.map(item => [item.hash, item])).values()).slice(0, 15);
              });
              
              setTotalIntercepted(prev => prev + newTxs.length);
            }
          } catch (err) {
            console.error("Erreur cycle de mise à jour :", err.message);
          }
        };

        updateData();
        mainInterval = setInterval(updateData, 10000); // Rafraîchissement toutes les 10s

      } catch (err) {
        if (isMounted) {
          setConnected(false);
          setLastError("Connexion impossible : Vérifiez votre accès internet");
        }
      }
    };

    initBlockchain();

    return () => {
      isMounted = false;
      if (mainInterval) clearInterval(mainInterval);
    };
  }, []);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <Activity size={32} color="#38bdf8" />
          <h1 style={styles.title}>Ethereum Pulse Explorer</h1>
        </div>
        <p style={styles.subtitle}>
          Projet Monétique 2026 | <strong>Marc Essone</strong> | INPTIC
        </p>

        <div style={styles.statsBar}>
          <div style={styles.statCard}>
            <Wifi size={16} color={connected ? "#4ade80" : "#f87171"} />
            <span style={{ color: connected ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
              {connected ? "HTTP LIVE" : "OFFLINE"}
            </span>
          </div>
          
          <div style={styles.statCard}>
            <Layers size={16} color="#818cf8" />
            <span>Dernier Bloc: <strong>{lastBlock}</strong></span>
          </div>

          <div style={styles.statCard}>
            <Zap size={16} color="#fbbf24" />
            <span>Gas: <strong style={{ color: '#fbbf24' }}>{gasPrice} Gwei</strong></span>
          </div>

          <div style={styles.statCard}>
            <Database size={16} color="#38bdf8" />
            <span>Flux: <strong>{totalIntercepted}</strong></span>
          </div>
        </div>

        {lastError && (
          <div style={styles.errorPanel}>
            <Terminal size={14} style={{ marginRight: '8px' }} />
            <span>{lastError}</span>
          </div>
        )}
      </header>

      <main style={styles.main}>
        {transactions.length === 0 ? (
          <div style={styles.loader}>
             <div className="spinner"></div>
             <p>Analyse de la blockchain Ethereum...</p>
          </div>
        ) : (
          transactions.map((tx) => (
            <div key={tx.hash} style={{
              ...styles.txCard,
              borderLeft: tx.isWhale ? '6px solid #fbbf24' : '6px solid #38bdf8',
            }}>
              <div style={styles.txRow}>
                <span style={styles.time}>🕒 {tx.time}</span>
                <span style={{ ...styles.value, color: tx.isWhale ? '#fbbf24' : '#38bdf8' }}>
                  {parseFloat(tx.value) > 0 ? `${parseFloat(tx.value).toFixed(4)} ETH` : "⛽ Frais de Gas"}
                </span>
              </div>
              
              <div style={styles.hash}>TX ID: {tx.hash.substring(0, 42)}...</div>

              <div style={styles.addressBox}>
                <div style={styles.addressItem}>
                  <small style={styles.addressLabel}>EXPÉDITEUR</small>
                  <code>{tx.from.substring(0, 16)}...</code>
                </div>
                <ArrowRight size={16} color="#475569" />
                <div style={styles.addressItem}>
                  <small style={styles.addressLabel}>DESTINATAIRE</small>
                  <code>{tx.to.substring(0, 16)}...</code>
                </div>
              </div>

              {tx.isWhale && (
                <div style={styles.whaleBadge}>
                  <ShieldAlert size={12} style={{ marginRight: '4px' }} />
                  BALEINE DÉTECTÉE
                </div>
              )}
            </div>
          ))
        )}
      </main>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .spinner { width: 30px; height: 30px; border: 3px solid #1e293b; border-top: 3px solid #38bdf8; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const styles = {
  container: { 
    backgroundColor: '#020617', 
    minHeight: '100vh', 
    color: '#f1f5f9', 
    fontFamily: 'Inter, sans-serif', 
    padding: '40px 20px',
    // Arrière-plan thématique Blockchain flouté par l'overlay sombre
    backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.9), rgba(2, 6, 23, 0.9)), url('https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=2832&auto=format&fit=crop')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  },
  header: { textAlign: 'center', marginBottom: '40px' },
  title: { fontSize: '2.4rem', margin: 0, background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '900' },
  subtitle: { color: '#94a3b8', fontSize: '0.9rem', marginTop: '10px', letterSpacing: '0.05em' },
  statsBar: { display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '25px', flexWrap: 'wrap' },
  statCard: { background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)', padding: '12px 18px', borderRadius: '12px', fontSize: '0.8rem', border: '1px solid rgba(30, 41, 59, 0.5)', display: 'flex', alignItems: 'center', gap: '8px' },
  errorPanel: { margin: '20px auto 0', maxWidth: '500px', background: '#450a0a', color: '#fca5a5', padding: '10px', borderRadius: '8px', fontSize: '0.8rem', border: '1px solid #991b1b', display: 'flex', alignItems: 'center' },
  main: { maxWidth: '750px', margin: '0 auto' },
  loader: { textAlign: 'center', marginTop: '80px', color: '#64748b' },
  txCard: { background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', padding: '20px', borderRadius: '16px', marginBottom: '16px', border: '1px solid rgba(30, 41, 59, 0.7)', position: 'relative', animation: 'fadeIn 0.5s ease-out' },
  whaleBadge: { position: 'absolute', bottom: '12px', right: '12px', background: '#fbbf24', color: '#000', padding: '4px 10px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 'bold', display: 'flex', alignItems: 'center' },
  txRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '14px' },
  time: { color: '#64748b', fontSize: '0.8rem' },
  value: { fontWeight: 'bold', fontSize: '1.2rem' },
  hash: { fontSize: '0.75rem', color: '#475569', marginBottom: '15px', fontFamily: 'monospace', overflow: 'hidden' },
  addressBox: { display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(2, 6, 23, 0.7)', padding: '12px', borderRadius: '12px' },
  addressItem: { flex: 1 },
  addressLabel: { color: '#475569', fontSize: '0.65rem', display: 'block', marginBottom: '4px' }
};

export default App;