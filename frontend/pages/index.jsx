import {Contract, providers} from "ethers";
import { formatEther } from "ethers/lib/utils";
import { useEffect, useState, useRef } from "react";
import Head  from "next/head";
import Web3Modal from "web3modal"
import {
  KRYPTO_KOIN_NFT_ADDRESS,
  KRYPTO_KOIN_DAO_ADDRESS,
  NFT_ABI,
  DAO_ABI,
} from "../constants"
import styles from "../styles/Home.module.css"

export default function Home() {
  const [treasuryBalance, setTreasuryBalance] = useState("0");
  const [walletConnected, setWalletConnected] = useState(false);
  const [loading,setLoading] = useState(false);
  const [isOwner,setIsOwner] = useState(false);
  const [numProposals,setNumProposals] = useState ("0");
  const [nftBalance,setNftBalance] = useState(0);
  const [fakeTokenId,setFakeTokenId] = useState("");
  const [proposals,setProposals] = useState ([]);
  const [selectedTab,setSelectedTab] = useState("");
  const web3ModalRef = useRef();

  async function getProviderOrSigner(needSigner = false){
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);
    const {chainId} = await web3Provider.getNetwork();

    if (chainId != 11155111){
      window.alert ("Please switch to the Sepolia network!");
      throw new Error ("Please switch to the Sepolia network!");
    }

    if (needSigner == true){
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  }
  async function connectWallet(){
    try{
      await getProviderOrSigner();
      setWalletConnected(true);
    }catch(err){
      console.error(err);
    }
  }

  async function getDAOOwner(){
    try{
      const signer = await getProviderOrSigner(true);
      const DAOContract = new Contract(KRYPTO_KOIN_DAO_ADDRESS,DAO_ABI,signer);
      const _owner = await DAOContract.owner();
      const address = await signer.getAddress();
      if(address.toLowerCase() === _owner.toLowerCase()){
          setIsOwner(true);
      }
    }catch(err){
      console.error(err);
    }
  }
  async function withdrawDAOEther(){
    try{
      const signer = await getProviderOrSigner(true);
      const DAOContract = new Contract(KRYPTO_KOIN_DAO_ADDRESS,DAO_ABI,signer);
      const tx = await DAOContract.withthdrawEther();
      setLoading(true);
      await tx.wait();
      setLoading(false);
      getDAOTreasuryBalance();
    }catch(err){
      console.error(err);
    }
  }

  async function getDAOTreasuryBalance(){
    try{
      const provider = await getProviderOrSigner();
      const balance = await provider.getBalance(KRYPTO_KOIN_DAO_ADDRESS);
      setTreasuryBalance(balance.toString());
    }catch(err){
      console.error(err);
    }
  }

  async function getNumProposalsInDAO(){
    try{
      const provider = await getProviderOrSigner();
      const DAOContract = new Contract(KRYPTO_KOIN_DAO_ADDRESS,DAO_ABI,provider);
      const daoNumProposals = await DAOContract.numProposals();
      setNumProposals(daoNumProposals.toString());
    }catch(err){
      console.error(err);
    }
  }

  async function getUserNftBalance(){
    try{
      const signer = await getProviderOrSigner(true);
      const NFTContract = new Contract(KRYPTO_KOIN_NFT_ADDRESS,NFT_ABI,signer);
      const balance = await NFTContract.balanceOf(signer.getAddress());
      setNftBalance(parseInt(balance.toString()));
    }catch(err){
      console.error(err);
    }
  }

  async function createProposal(){
    try{
      const signer = await getProviderOrSigner(true);
      const DAOContract = new Contract(KRYPTO_KOIN_DAO_ADDRESS,DAO_ABI,signer);
      const txn = await DAOContract.createProposal(fakeTokenId);
      setLoading(true);
      await txn.wait();
      await getNumProposalsInDAO();
      setLoading(false);
    }catch(err){
    console.error(err);
    }
  }

  async function fetchProposalById(id){
    try{
      const provider = await getProviderOrSigner();
      const DAOContract = new Contract(KRYPTO_KOIN_DAO_ADDRESS,DAO_ABI,provider);
      const proposal = await DAOContract.proposals(id);
      const parsedProposal = {
        proposalId : id,
        nftTokenId : proposal.nftTokenId.toString(),
        deadline : new Date(parseInt(proposal.deadline.toString()) * 1000),
        executed : proposal.executed,
        yayVotes : proposal.yayVotes.toString(),
        nayVotes : proposal.nayVotes.toString(),
      };
      return parsedProposal;
    }catch(err){
      console.error(err);
    }  
  }

  async function fetchAllProposals(){
    try{
      const proposals = [];
      for (let i = 0;i<numProposals;i++){
        const proposal = await fetchProposalById(i);
        proposals.push(proposal);
      }
      setProposals(proposals);
      return proposals;
    }catch(err){
      console.error(err);
    }
  }

  async function voteOnProposal(proposalId,_vote){
    try{
      const signer = await getProviderOrSigner(true);
      const DAOContract = new Contract(KRYPTO_KOIN_DAO_ADDRESS,DAO_ABI,signer);
      let vote = _vote === "YAY"? 0:1;
      const txn = await DAOContract.voteForProposal(proposalId,vote);
      setLoading(true);
      await txn.wait();
      setLoading(false);
      await fetchAllProposals();
    }catch(error){
    console.error(error);
    window.alert(error.reason)
    }
  }

  async function executeProposal(proposalId){
    try{
      const signer = await getProviderOrSigner(true);
      const DAOContract = new Contract(KRYPTO_KOIN_DAO_ADDRESS,DAO_ABI,signer);
      const txn = await DAOContract.executeProposal(proposalId);
      setLoading(true);
      await txn.wait();
      setLoading(false);
      await fetchAllProposals();
      getDAOTreasuryBalance();
    }catch (error) {
    console.error(error);
    window.alert(error.reason);
    }
  }

  useEffect(()=>{
    if(!walletConnected){
      web3ModalRef.current = new Web3Modal({
        network : "sepolia",
        providerOptions: {},
        disableInjectedProvider: false,
      });

      connectWallet().then(() =>{
        getDAOTreasuryBalance();
        getNumProposalsInDAO();
        getUserNftBalance();
        getDAOOwner();
      });
    }
  },[walletConnected])

  useEffect(()=>{
    if(selectedTab === "View Proposals"){
      fetchAllProposals();
    }
  },[selectedTab]);

  function renderTabs(){
    if(selectedTab === "Create Proposal"){
      return renderCreateProposalTab();
    }else if (selectedTab === "View Proposals"){
      return renderViewProposalsTab();
    }
  }

  function renderCreateProposalTab(){
     if(loading){
      return (
        <div className={styles.description}>Loading...Waiting for transaction</div>)
     }else if(nftBalance === 0){
      return (
        <div className={styles.description} >You don't have any Krypto Koins NFTs</div>)
     }else{
      return(
        <div className={styles.container}>
          <label>Fake NFT token ID to purchase:</label>
          <input placeholder="0" type="number" onChange={(e) => setFakeTokenId(e.target.value)}></input>
          <button className={styles.button2} onClick={createProposal}>Create</button>
        </div>)
     }
  }

  function renderViewProposalsTab(){
    if(loading){
      return (
        <div className={styles.description} >Loading...Waiting for transaction</div>)
    }else if(proposals.length === 0){
      return (<div>No proposals have been created</div>)
    }else{
      return (
        <div>
          {proposals.map((p,index) => (
            <div key={index} className={styles.proposalCard}>
              <p>Proposal ID: {p.proposalId}</p>
              <p>Fake NFT to purchase: {p.nftTokenId}</p>
              <p>Deadline: {p.deadline.toLocaleString()}</p>
              <p>Yay Votes: {p.yayVotes}</p>
              <p>Nay Votes: {p.nayVotes}</p>
              <p>Executed: {p.executed.toString()}</p>
              {p.deadline > Date.now() && !p.executed ? (
                <div className={styles.flex}>
                  <button className={styles.button2} onClick={() => {voteOnProposal(p.proposalId,"YAY")}}>Vote YAY</button>
                  <button className={styles.button2} onClick={() => {voteOnProposal(p.proposalId,"NAY")}}>Vote NAY</button>
                </div>
              ):p.deadline < Date.now() && !p.executed ? (
                <div className={styles.flex}>
                  <button className={styles.button2} onClick={() => {executeProposal(p.proposalId)}}>Execute Proposal{""}{p.yayVotes > p.nayVotes ? "(YAY)" : "(NAY)"}</button>
                </div>
              ):(
                <div className={styles.description}>Proposal Executed</div>
              )}
            </div>
          ))}
        </div>
      )
    }
  }

  return(
    <div>
      <Head>
        <title>Krypto Koins DAO</title>
        <meta name="description" content="CryptoDevs DAO" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
          <div>
            <h1 className={styles.title}>Welcome to Krypto Koins!</h1>
            <div className={styles.description}>Welcome to the DAO!</div>
            <div className={styles.description}>
              Your Krypto Koins NFT Balance: {nftBalance}
              <br />
              Treasury Balance: {formatEther(treasuryBalance)} ETH
              <br />
              Total Number of Proposals: {numProposals}
            </div>
            <div className={styles.flex}>
              <button
                className={styles.button}
                onClick={() => setSelectedTab("Create Proposal")}
              >
                Create Proposal
              </button>
              <button
                className={styles.button}
                onClick={() => setSelectedTab("View Proposals")}
              >
                View Proposals
              </button>
            </div>
            {renderTabs()}
            {/* Display additional withdraw button if connected wallet is owner */}
            {isOwner ? (
              <div>
              {loading ? <button className={styles.button}>Loading...</button>
                       : <button className={styles.button} onClick={withdrawDAOEther}>
                           Withdraw DAO ETH
                         </button>
              }
              </div>
              ) : ("")
            }
          </div>
          <div>
            <img className={styles.image} src="/KryptoKoins/0.svg" />
          </div>
        </div>
  
        <footer className={styles.footer}>
          Made with &#10084; by Krypto Koins
        </footer>
    </div>
    )
}