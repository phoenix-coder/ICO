const { ethers } = require("hardhat");

async function main() {
  const [deployer1, deployer2] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer1.address);

  // Deploy Token Contract
  console.log("Deploying Token(CLMN) Contract...");
  const Token = await ethers.getContractFactory("Token",deployer1);
  const token = await Token.deploy("CLMN Token", "CLMN", 1000000000);
  await token.waitForDeployment();
  console.log(`Token(CLMN) deployed to: ${await token.getAddress()} by ${deployer1.address}`);

  // Deploy USDT-Token Contract
  console.log("Deploying Token2(USDT) Contract...");
  const Token2 = await ethers.getContractFactory("Token2",deployer2);
  const token2 = await Token2.deploy("Tether USDT", "USDT", 1000000000);
  await token2.waitForDeployment();
  console.log(`Token2(USDT) deployed to: ${await token2.getAddress()} by ${deployer2.address}`);

  // Deploy ICO Contract
  console.log("Deploying ICO Contract...");
  const ICO = await ethers.getContractFactory("ICO",deployer1);
  const ico = await ICO.deploy(await token.getAddress(), await token2.getAddress());
  await ico.waitForDeployment();
  console.log(`ICO deployed to: ${await ico.getAddress()} by ${deployer1.address}`);

  // Uncomment if you need to transfer tokens to the ICO contract
  /*
  console.log("Transferring tokens to ICO contract...");
  const totalSupply = await token.totalSupply();
  await token.transfer(await ico.getAddress(), totalSupply / 2n);
  console.log("50% of tokens transferred to ICO contract");
  */
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
