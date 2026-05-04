import React, { useEffect, useState } from "react";
import Web3 from "web3";

const INFURA_WSS = `wss://mainnet.infura.io/ws/v3/${process.env.REACT_APP_INFURA_ID}`;

function App() {
  const [transactions, setTransactions] = useState([]);
  const [connected, setConnected] = useState(false);
  const [totalSeen, setTotalSeen] = useState(0); // Compteur pour le jury

  useEffect(() => {
    const provider = new Web3.providers.WebsocketProvider(INFURA_WSS);
    const web3 = new Web3(provider);

    provider.on("connect", () => setConnected(true));
    provider.on("error", () => setConnected(false));

    let subscription;

    const startSubscription = async () => {
      try {
        subscription = await web3.eth.subscribe("pendingTransactions");
        
        subscription.on("data", async (hash) => {
          setTotalSeen(prev => prev + 1); // Incrémente le compteur total
          
          try {
            const tx = await web3.eth.getTransaction(hash);
            
            if (tx && tx.from) {
              const newTx = {
                hash: tx.hash,
                from: tx.from,
                to: tx.to || "Création de contrat",
                value: web3.utils.fromWei(tx.value || "0", "ether"),
                time: new Date().toLocaleTimeString()
              };

              setTransactions((prev) => [newTx, ...prev].slice(0, 15)); // On garde 15 pour la clarté
            }
          } catch (e) {
            // Erreur silencieuse pour les transactions déjà validées
          }
        });
      } catch (error) {
        console.error("Erreur de souscription:", error);
      }
    };

    startSubscription();
    return () => provider.disconnect();
  }, []);

  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', color: '#f8fafc', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* HEADER PRO */}
      <header style={{ textAlign: 'center', marginBottom: '40px', borderBottom: '1px solid #1e293b', paddingBottom: '20px' }}>
        <h1 style={{ fontSize: '2.5rem', margin: '0', background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Ethereum Pulse Explorer
        </h1>
        <p style={{ color: '#94a3b8', marginTop: '10px' }}>
          INPTIC 2026 | Spécialisation Génie Informatique — <strong>Marc Essone</strong>
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
          <div style={{ background: '#1e293b', padding: '10px 20px', borderRadius: '30px', fontSize: '0.9rem' }}>
             Statut : <span style={{ color: connected ? '#4ade80' : '#f87171' }}>{connected ? "● Connecté" : "● Déconnecté"}</span>
          </div>
          <div style={{ background: '#1e293b', padding: '10px 20px', borderRadius: '30px', fontSize: '0.9rem' }}>
             Transactions analysées : <strong>{totalSeen}</strong>
          </div>
        </div>
      </header>

      {/* LISTE DES TRANSACTIONS */}
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>
            <div className="spinner" style={{ marginBottom: '20px' }}>⏳</div>
            Synchronisation avec le réseau Ethereum...
          </div>
        ) : (
          transactions.map((tx, index) => (
            <div key={tx.hash} style={{ 
              background: '#1e293b', 
              marginBottom: '15px', 
              padding: '20px', 
              borderRadius: '12px',
              border: '1px solid #334155',
              transition: 'all 0.3s ease',
              animation: index === 0 ? 'slideIn 0.5s ease-out' : 'none'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>🕒 {tx.time}</span>
                <span style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '1.1rem' }}>
                  {parseFloat(tx.value) > 0 ? `💎 ${parseFloat(tx.value).toFixed(4)} ETH` : "⛽ Gas Only"}
                </span>
              </div>
              
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '10px' }}>
                <strong>ID:</strong> <span style={{ color: '#64748b' }}>{tx.hash}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '0.85rem', background: '#0f172a', padding: '10px', borderRadius: '8px' }}>
                <div style={{ flex: 1 }}>
                   <div style={{ color: '#64748b', fontSize: '0.7rem' }}>EXPÉDITEUR</div>
                   {tx.from.substring(0, 15)}...
                </div>
                <div style={{ color: '#38bdf8' }}>➔</div>
                <div style={{ flex: 1 }}>
                   <div style={{ color: '#64748b', fontSize: '0.7rem' }}>DESTINATAIRE</div>
                   {tx.to.substring(0, 15)}...
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Animation CSS simple */}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default App;