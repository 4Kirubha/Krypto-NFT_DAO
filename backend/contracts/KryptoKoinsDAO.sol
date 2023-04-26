// SPDX-License-Identifier:MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
    
    interface IFakeNFTMarketplace {
        function getPrice() external view returns(uint);
        function  availability(uint _tokenId) external view returns(bool);
        function purchase(uint _tokenId) external payable;
    }
    interface IKrypto {
        function balanceOf(address owner) external view returns (uint256);
        function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256);
    }

contract KryptoKoinsDAO is Ownable {
    struct Proposal{
        uint nftTokenId;
        uint deadline;
        bool executed;
        uint yayVotes;
        uint nayVotes;
        mapping (uint => bool) voters;
    }
    mapping (uint => Proposal) public proposals;
    uint public numProposals;
    IFakeNFTMarketplace nftMarketplace;
    IKrypto kryptoNFT;

    constructor (address _nftMarketplace,address _kryptoNFT) payable {
        nftMarketplace = IFakeNFTMarketplace (_nftMarketplace);
        kryptoNFT = IKrypto (_kryptoNFT);
    }
    modifier nftHolderOnly {
        require(kryptoNFT.balanceOf(msg.sender) > 0);
        _;
    }

    modifier activeProposalsOnly(uint proposalIndex){
        require(proposals[proposalIndex].deadline > block.timestamp,"Deadline passed");
        _;
    }
    function createProposal(uint _nftTokenId) external nftHolderOnly returns(uint){
        require (nftMarketplace.availability(_nftTokenId),"This NFT not for sale");
        Proposal storage proposal = proposals[numProposals];
        proposal.nftTokenId = _nftTokenId;
        proposal.deadline = block.timestamp + 5 minutes;
        numProposals++;

        return numProposals -1;
    }

    enum Vote{yay,nay}

    function voteForProposal(uint proposalIndex,Vote vote)
        external activeProposalsOnly(proposalIndex){
            Proposal storage proposal = proposals[proposalIndex];
            uint voterNftBalance = kryptoNFT.balanceOf(msg.sender);
            uint numVotes;
            for(uint i = 0;i < voterNftBalance;i++){
                uint tokenId = kryptoNFT.tokenOfOwnerByIndex(msg.sender,i);
                if (proposal.voters[tokenId] == false){
                    numVotes++;
                    proposal.voters[tokenId] = true;
                }
            }
            require(numVotes > 0);
            if(vote == Vote.nay){
                proposal.nayVotes += numVotes;
            }else{
                proposal.yayVotes += numVotes;
            }
    }

    modifier inactiveProposalsOnly(uint proposalIndex){
        require(proposals[proposalIndex].deadline <= block.timestamp,"Deadline not exceeded");
        require(proposals[proposalIndex].executed == false,"Already Executed");
        _;
    }
    function executeProposal(uint proposalIndex) external nftHolderOnly inactiveProposalsOnly(proposalIndex){
        Proposal storage proposal = proposals[proposalIndex];
        if(proposal.yayVotes > proposal.nayVotes){
            uint nftPrice = nftMarketplace.getPrice();
            require(address(this).balance > nftPrice,"NOT ENOUGH FUNDS");
            nftMarketplace.purchase{value: nftPrice}(proposal.nftTokenId);
        }
        proposal.executed = true;
    }

    function withthdrawEther() external payable onlyOwner{
        uint amount = address(this).balance;
        require(amount > 0,"NOT ENOUGH FUNDS TO WITHDRAW");
        (bool sent,) = owner().call{value: amount}("");
        require(sent,"TRANSACTION FAILED");
    }
    receive () external payable{}
    fallback () external payable{}
}