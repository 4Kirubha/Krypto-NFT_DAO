const{ethers} = require("hardhat");
const {KRYPTO_NFT_ADDRESS} = require("../constants/index");

const kryptoNFTAddress = KRYPTO_NFT_ADDRESS;
async function main(){
    const fakeNFTmarketplace = await ethers.getContractFactory("FakeNFTMarketplace");
const deployedFakeNFTmarketplace = await fakeNFTmarketplace.deploy();
await deployedFakeNFTmarketplace.deployed();

console.log("FAKE NFT MARKETPLACE ADDRESS", deployedFakeNFTmarketplace.address);

const kryptoDAO = await ethers.getContractFactory("KryptoKoinsDAO");
const deployedKryptoDAO = await kryptoDAO.deploy(deployedFakeNFTmarketplace.address, kryptoNFTAddress,{value: ethers.utils.parseEther("0.5")});
await deployedKryptoDAO.deployed();
console.log("KRYPTO KOINS DAO ADDRESS",deployedKryptoDAO.address);

}

main();
