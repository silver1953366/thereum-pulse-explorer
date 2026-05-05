import React, { useEffect, useState, useRef } from "react";
import Web3 from "web3";
import { 
  Activity, Wifi, Zap, ArrowRight, 
  ShieldAlert, Database, Terminal, Layers 
} from "lucide-react";

const INFURA_ID = process.env.REACT_APP_INFURA_ID;
// On utilise HTTPS au lieu de WSS pour contourner les erreurs de handshake
const INFURA_HTTP = `https://mainnet.infura.io/v3/${INFURA_ID}`;

function App() {
  const [transactions, setTransactions] = useState([]);
  const [connected, setConnected] = useState(false);
  const [totalIntercepted, setTotalIntercepted] = useState(0);
  const [gasPrice, setGasPrice] = useState("...");
  const [lastBlock, setLastBlock] = useState(0);
  const [lastError, setLastError] = useState(null);

  const transactionsRef = useRef([]);

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

        // Initialisation en mode HTTP
        const provider = new Web3.providers.HttpProvider(INFURA_HTTP);
        web3 = new Web3(provider);
        
        // Test de connexion initial
        await web3.eth.getBlockNumber();
        if (isMounted) {
          setConnected(true);
          setLastError(null);
          console.log("✅ Connexion HTTP établie avec Infura");
        }

        const updateData = async () => {
          if (!isMounted) return;
          try {
            // 1. Récupération du Gas
            const price = await web3.eth.getGasPrice();
            const gwei = web3.utils.fromWei(price, 'gwei');
            setGasPrice(Math.round(gwei));

            // 2. Récupération du dernier bloc avec ses transactions
            const blockNum = await web3.eth.getBlockNumber();
            setLastBlock(Number(blockNum));

            const block = await web3.eth.getBlock(blockNum, true);
            
            if (block && block.transactions && block.transactions.length > 0) {
              // On prend les 10 dernières transactions du bloc
              const newTxs = block.transactions.slice(0, 10).map(tx => ({
                hash: tx.hash,
                from: tx.from,
                to: tx.to || "Contrat Déployé",
                value: web3.utils.fromWei(tx.value || "0", "ether"),
                time: new Date().toLocaleTimeString(),
                isWhale: parseFloat(web3.utils.fromWei(tx.value || "0", "ether")) >= 0.5
              }));

              // Fusion intelligente pour éviter les doublons à l'affichage
              setTransactions(prev => {
                const combined = [...newTxs, ...prev];
                // Filtrer par hash unique et limiter à 15
                return Array.from(new Map(combined.map(item => [item.hash, item])).values()).slice(0, 15);
              });
              
              setTotalIntercepted(prev => prev + newTxs.length);
            }
          } catch (err) {
            console.error("Erreur de mise à jour :", err.message);
          }
        };

        // Première exécution puis répétition toutes les 10 secondes
        updateData();
        mainInterval = setInterval(updateData, 10000);

      } catch (err) {
        console.error("Erreur Init:", err);
        if (isMounted) {
          setConnected(false);
          setLastError("Erreur réseau : Vérifiez votre connexion ou clé Infura");
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
          Projet DTS 2026 | <strong>Marc Essone</strong> | INPTIC
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
            <span>Bloc: <strong>{lastBlock}</strong></span>
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
                <span style={styles.time}>{tx.time}</span>
                <span style={{ ...styles.value, color: tx.isWhale ? '#fbbf24' : '#38bdf8' }}>
                  {parseFloat(tx.value) > 0 ? `${parseFloat(tx.value).toFixed(4)} ETH` : "⛽ Gas Transaction"}
                </span>
              </div>
              
              <div style={styles.hash}>TX ID: {tx.hash.substring(0, 40)}...</div>

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
  container: { backgroundColor: '#020617', minHeight: '100vh', color: '#f1f5f9', fontFamily: 'Inter, sans-serif', padding: '40px 20px' },
  header: { textAlign: 'center', marginBottom: '40px' },
  title: { fontSize: '2.2rem', margin: 0, background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '800' },
  subtitle: { color: '#64748b', fontSize: '0.9rem', marginTop: '10px' },
  statsBar: { display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '25px', flexWrap: 'wrap' },
  statCard: { background: '#0f172a', padding: '10px 15px', borderRadius: '10px', fontSize: '0.8rem', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '8px' },
  errorPanel: { margin: '20px auto 0', maxWidth: '500px', background: '#450a0a', color: '#fca5a5', padding: '10px', borderRadius: '8px', fontSize: '0.8rem', border: '1px solid #991b1b', display: 'flex', alignItems: 'center' },
  main: { maxWidth: '700px', margin: '0 auto' },
  loader: { textAlign: 'center', marginTop: '80px', color: '#64748b' },
  txCard: { background: '#0f172a', padding: '18px', borderRadius: '14px', marginBottom: '14px', border: '1px solid #1e293b', position: 'relative', animation: 'fadeIn 0.4s ease-out' },
  whaleBadge: { position: 'absolute', bottom: '10px', right: '10px', background: '#fbbf24', color: '#000', padding: '3px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold', display: 'flex', alignItems: 'center' },
  txRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px' },
  time: { color: '#64748b', fontSize: '0.75rem' },
  value: { fontWeight: 'bold', fontSize: '1.1rem' },
  hash: { fontSize: '0.7rem', color: '#475569', marginBottom: '12px', fontFamily: 'monospace', overflow: 'hidden' },
  addressBox: { display: 'flex', alignItems: 'center', gap: '10px', background: '#020617', padding: '10px', borderRadius: '8px' },
  addressItem: { flex: 1 },
  addressLabel: { color: '#475569', fontSize: '0.6rem', display: 'block', marginBottom: '2px' }
};

export default App;