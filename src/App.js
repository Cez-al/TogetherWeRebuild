import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers'; 
import TogetherWeRebuildABI from './TogetherWeRebuild.json'; 

const CONTRACT_ADDRESS = "0xDCECFCf99F1AE176D4C929E6a55380240340D2E1";

const App = () => {
  const [haveMetamask, setHaveMetamask] = useState(typeof window.ethereum !== 'undefined');
  const [account, setAccount] = useState('');
  const [contractInstance, setContractInstance] = useState(null);
  const [balance, setBalance] = useState(0);
  const [donation, setDonation] = useState('');
  const [username, setUsername] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // Automatyczne pobieranie balansu po załadowaniu strony
  useEffect(() => {
    if (haveMetamask) {
      fetchBalance(); // Pobierz saldo od razu po załadowaniu
    }
  }, [haveMetamask]);

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);  // Zapyta użytkownika o zgodę na połączenie z portfelem
        const signer = await provider.getSigner(); // Pobierz aktualnie połączony portfel
        const address = await signer.getAddress();
        setAccount(address);
  
        const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, TogetherWeRebuildABI, signer);
        setContractInstance(contractInstance);
        fetchBalance();  // Odświeżanie balansu kontraktu
      } else {
        alert("Please install MetaMask!");
      }
    } catch (error) {
      console.error("Connection failed:", error);
      alert("Failed to connect MetaMask. Please try again.");
    }
  };
  
  const fetchBalance = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum); // Użyj providera MetaMask
        const contractBalance = await provider.getBalance(CONTRACT_ADDRESS); // Pobierz balans kontraktu
        const formattedBalance = ethers.formatEther(contractBalance);
        setBalance(parseFloat(formattedBalance).toFixed(4)); // Zaokrąglenie do 4 miejsc po przecinku
      } catch (error) {
        console.error("Failed to fetch balance:", error);
      }
    } else {
      console.error("MetaMask is not installed.");
    }
  };
  
  // Ustawienie interwału dla aktualizacji balansu co 10 sekund
  useEffect(() => {
    if (contractInstance) {
      const interval = setInterval(() => {
        fetchBalance();
      }, 10000); // Aktualizuj co 10 sekund

      return () => clearInterval(interval); // Wyczyść interwał przy unmountowaniu komponentu
    }
  }, [contractInstance]);

  const donate = async () => {
    try {
      if (!donation || isNaN(donation) || parseFloat(donation) <= 0) {
        alert("Please enter a valid donation amount.");
        return;
      }
  
      if (!username && !anonymous) {
        alert("Please enter a username or check anonymous donation.");
        return;
      }
  
      if (contractInstance) {
        setLoading(true);
        const formattedUsername = anonymous ? "Anonymous" : username;
        const formattedAmount = ethers.parseEther(donation); 
  
        try {
          const tx = await contractInstance.donate(formattedUsername, anonymous, { 
            value: formattedAmount,
            gasLimit: 900000
          });
          setTransactionHash(tx.hash);
          await tx.wait();  // Oczekiwanie na potwierdzenie transakcji
          
          fetchBalance();  // Odświeżenie balansu po wpłacie
          
          alert('Thank you for your donation!');
        } catch (error) {
          console.error("Donation failed:", error);
          alert('Donation failed, please try again.');
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error("An error occurred during donation:", error);
      setLoading(false);
    }
  };

  const withdrawFunds = async () => {
    try {
      if (contractInstance) {
        setWithdrawLoading(true);
        const tx = await contractInstance.withdraw({ gasLimit: 900000 }); 
        await tx.wait(); // Oczekiwanie na potwierdzenie transakcji
        fetchBalance(); // Odświeżenie balansu po wypłacie
        alert('Funds withdrawn successfully!');
      }
    } catch (error) {
      console.error("Withdrawal failed:", error);
      alert('Withdrawal failed, please try again.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', textAlign: 'center', padding: '50px', position: 'relative', zIndex: 1 }}>
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.6)', // Białe tło z lekka przezroczystością
        padding: '40px',
        borderRadius: '20px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(15px)', // Efekt rozmycia tła
        maxWidth: '500px',
        margin: '0 auto'
      }}>
        <h1 style={{ color: '#2c3e50', fontSize: '2.5em', margin: '0 0 20px 0' }}>Together We Rebuild</h1>
        <p style={{ fontSize: '1.2em', color: '#34495e' }}>Contract Balance: <strong>{balance} ETH</strong></p>
        <p style={{ fontSize: '1.2em', color: '#34495e' }}>Target: <strong>100 ETH</strong></p>
        <p style={{ fontSize: '1.2em', color: '#34495e' }}>End Date: <strong>31.12.2025</strong></p>
        {!haveMetamask ? (
          <p style={{ color: 'red', fontWeight: 'bold' }}>Please Install MetaMask</p>
        ) : !account ? (
          <button style={{
            padding: '15px 30px',
            backgroundColor: '#3498db',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1em',
            transition: 'background-color 0.3s',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            marginTop: '10px'
          }} onClick={connectWallet}>Connect MetaMask</button>
        ) : (
          <div>
            <p style={{ fontSize: '1.2em', marginBottom: '10px', color: '#2c3e50' }}>
              Connected: <strong>{account}</strong>
            </p>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={anonymous}
              style={{
                opacity: anonymous ? 0.5 : 1,
                padding: '12px',
                margin: '10px 0',
                borderRadius: '8px',
                border: '1px solid #ccc',
                width: '100%',
                maxWidth: '400px'
              }}
            />
            <label style={{ color: 'black', fontSize: '1.1em', margin: '10px 0', display: 'block' }}>
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
              <span style={{ marginLeft: '5px' }}>Donate Anonymously</span>
            </label>
            <input
              type="text"
              placeholder="Donation Amount (ETH)"
              value={donation}
              onChange={(e) => setDonation(e.target.value)}
              style={{
                padding: '12px',
                margin: '10px 0',
                borderRadius: '8px',
                border: '1px solid #ccc',
                width: '100%',
                maxWidth: '400px'
              }}
            />
            <button style={{
              padding: '15px 30px',
              backgroundColor: '#27ae60',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1em',
              transition: 'background-color 0.3s',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              marginTop: '10px'
            }} onClick={donate} disabled={loading}>
              {loading ? 'Processing...' : 'Donate'}
            </button>
            <button style={{
              padding: '15px 30px',
              backgroundColor: '#e74c3c',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1em',
              transition: 'background-color 0.3s',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              marginTop: '10px',
              marginLeft: '10px'
            }} onClick={withdrawFunds} disabled={withdrawLoading}>
              {withdrawLoading ? 'Withdrawing...' : 'Withdraw'}
            </button>
            {transactionHash && (
              <p style={{ color: 'green', fontWeight: 'bold', marginTop: '20px' }}>
                Transaction Hash: <a href={`https://sepolia.etherscan.io/tx/${transactionHash}`} target="_blank" rel="noopener noreferrer">{transactionHash}</a>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
