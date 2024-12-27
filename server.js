const express = require('express');
const { Web3 } = require('web3');
const fs = require('fs');

// Initialize the Express application
const app = express();
app.use(express.json());

// Connect to your local Hardhat node
const providerURL = "http://127.0.0.1:8545";
const web3 = new Web3(providerURL);

// Replace with your deployed contract addresses
const tokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const token2Address = "0x8464135c8F25Da09e49BC8782676a84730C318bC";
const icoAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

// Load ABIs of the contracts
const tokenAbi = JSON.parse(fs.readFileSync('./artifacts/contracts/Token.sol/Token.json', 'utf-8')).abi;
const token2Abi = JSON.parse(fs.readFileSync('./artifacts/contracts/Token2.sol/Token2.json', 'utf-8')).abi;
const icoAbi = JSON.parse(fs.readFileSync('./artifacts/contracts/ICO.sol/ICO.json', 'utf-8')).abi;  

// Initialize the contracts
const tokenContract = new web3.eth.Contract(tokenAbi, tokenAddress);
const token2Contract = new web3.eth.Contract(token2Abi, token2Address);
const icoContract = new web3.eth.Contract(icoAbi, icoAddress);

function stringifyBigInt(obj) {
    return JSON.parse(
        JSON.stringify(obj, (_, value) => (typeof value === "bigint" ? value.toString() : value))
    );
}

// Add this route to your server.js file
app.get("/totalSupply", async (req, res) => {
    try {
        const totalSupply = await tokenContract.methods.totalSupply().call();
        res.send(stringifyBigInt({ success: true, totalSupply }));
    } catch (error) {
        res.status(500).send(stringifyBigInt({ success: false, error: error.message }));
    }
});

app.get("/name", async (req, res) => {
    try {
        const name = await tokenContract.methods.name().call();
        res.send(stringifyBigInt({ success: true, name }));
    } catch (error) {
        res.status(500).send(stringifyBigInt({ success: false, error: error.message }));
    }
});

app.post("/transferTokens", async (req, res) => {
    try {
        // Hardcoded owner and recipient addresses
        const ownerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Replace with your owner address
        const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Replace with your private key
        const recipientAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; // Replace with the recipient address

        // Get the total balance of the owner
        const balance = await tokenContract.methods.balanceOf(ownerAddress).call();
        if (balance <= 0) {
            return res.status(400).send(stringifyBigInt({ success: false, error: "Insufficient balance" }));
        }

        // Create transaction to transfer tokens
        const tx = tokenContract.methods.transfer(recipientAddress, balance);

        // Estimate gas, sign, and send the transaction
        const gas = await tx.estimateGas({ from: ownerAddress });
        const gasPrice = await web3.eth.getGasPrice();
        const data = tx.encodeABI();

        const signedTx = await web3.eth.accounts.signTransaction(
            {
                to: tokenAddress,
                data,
                gas,
                gasPrice,
                nonce: await web3.eth.getTransactionCount(ownerAddress, 'latest'),
            },
            privateKey
        );

        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        res.send(stringifyBigInt({ success: true, receipt }));
    } catch (error) {
        res.status(500).send(stringifyBigInt({ success: false, error: error.message }));
    }
});

app.get("/check-CLMN-Balance", async (req, res) => {
    try {
        // Hardcoded address for balance check
        //const checkAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; // Replace with the desired address to check balance
        const { ownerAddress } = req.body;
        // Fetch the balance of the hardcoded address
        const balance = await tokenContract.methods.balanceOf(ownerAddress).call();

        res.send(stringifyBigInt({ success: true, balance }));
    } catch (error) {
        res.status(500).send(stringifyBigInt({ success: false, error: error.message }));
    }
});

app.get("/check-USDT-Balance", async (req, res) => {
    try {
        // Hardcoded address for balance check
        //const checkAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; // Replace with the desired address to check balance
        const { ownerAddress } = req.body;
        // Fetch the balance of the hardcoded address
        const balance = await token2Contract.methods.balanceOf(ownerAddress).call();

        res.send(stringifyBigInt({ success: true, balance }));
    } catch (error) {
        res.status(500).send(stringifyBigInt({ success: false, error: error.message }));
    }
});

app.post("/approve-tokens", async (req, res) => {
    try {
        const { userAddress, amount } = req.body; // User provides address and amount

        // Validate amount and address
        if (!amount || isNaN(amount)) {
            return res.status(400).send({ success: false, error: "Invalid amount" });
        }
        if (!userAddress) {
            return res.status(400).send({ success: false, error: "User address is required" });
        }

        // Convert amount to Wei
        //const amountInWei = web3.utils.toWei(amount.toString(), "ether");
        const spenderAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
        // Testing userAddress = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
        // Approve the spender address to spend the tokens on behalf of the user address
        const tx = await token2Contract.methods
            .approve(spenderAddress, amount ) // Approve spender to spend tokens
            .send({ from: userAddress }); // Sending the transaction from the user-provided address

        // Send successful response with the transaction receipt
        res.send(stringifyBigInt({ success: true, transaction: tx }));
    } catch (error) {
        console.error("Error in approval:", error);
        res.status(500).send(stringifyBigInt({ success: false, error: error.message }));
    }
});

app.get("/check-allowance", async (req, res) => {
    try {
        const { ownerAddress } = req.body;

        // Validate input addresses
        if (!ownerAddress) {
            return res.status(400).send({ success: false, error: "Owner addresses are required" });
        }
        // Testing ownerAddress = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
        // Get allowance for the spender to spend tokens on behalf of the owner
        const spenderAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
        const allowance = await token2Contract.methods.allowance(ownerAddress, spenderAddress).call();

        // Send successful response with the allowance value
        res.send(stringifyBigInt({ success: true, allowance }));
    } catch (error) {
        console.error("Error in checking allowance:", error);
        res.status(500).send(stringifyBigInt({ success: false, error: error.message }));
    }
});

app.post("/set-price", async (req, res) => {
    const { value } = req.body; // Expecting value from the request body
    
    const ownerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Replace with your owner address
    const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

    if (value === undefined) {
        return res.status(400).send({ success: false, error: "Value is required" });
    }

    try {
    
        const tx = icoContract.methods.setPrice(value);
        const gas = await tx.estimateGas({ from: ownerAddress });
        const gasPrice = await web3.eth.getGasPrice();
        const signedTx = await web3.eth.accounts.signTransaction(
            {
                to: icoAddress,
                data: tx.encodeABI(),
                gas,
                gasPrice,
                nonce: await web3.eth.getTransactionCount(ownerAddress, 'latest'),
            },
            privateKey
        );

        // Send signed transaction
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        res.send(stringifyBigInt({ success: true, receipt }));
    } catch (error) {
        console.error("Error setting value:", error);
        res.status(500).send(stringifyBigInt({ success: false, error: error.message }));
    }
});

app.post("/set-presale1-time", async (req, res) => {
    const { value } = req.body; // Expecting value from the request body
    
    const ownerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Replace with your owner address
    const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

    if (value === undefined) {
        return res.status(400).send({ success: false, error: "Value is required" });
    }

    try {
    
        const tx = icoContract.methods.setPresale1Time(value);
        const gas = await tx.estimateGas({ from: ownerAddress });
        const gasPrice = await web3.eth.getGasPrice();
        const signedTx = await web3.eth.accounts.signTransaction(
            {
                to: icoAddress,
                data: tx.encodeABI(),
                gas,
                gasPrice,
                nonce: await web3.eth.getTransactionCount(ownerAddress, 'latest'),
            },
            privateKey
        );

        // Send signed transaction
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        res.send(stringifyBigInt({ success: true, receipt }));
    } catch (error) {
        console.error("Error setting value:", error);
        res.status(500).send(stringifyBigInt({ success: false, error: error.message }));
    }
});

app.get("/check-status", async (req, res) => {
    try {
        const name = await icoContract.methods.checkStatus().call();
        res.send(stringifyBigInt({ success: true, name }));
    } catch (error) {
        res.status(500).send(stringifyBigInt({ success: false, error: error.message }));
    }
});

app.post("/set-status", async (req, res) => {
    const { value } = req.body; // Expecting value from the request body
    
    const ownerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Replace with your owner address
    const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

    if (value === undefined) {
        return res.status(400).send({ success: false, error: "Value is required" });
    }

    try {
    
        const tx = icoContract.methods.changeStatus(value);
        const gas = await tx.estimateGas({ from: ownerAddress });
        const gasPrice = await web3.eth.getGasPrice();
        const signedTx = await web3.eth.accounts.signTransaction(
            {
                to: icoAddress,
                data: tx.encodeABI(),
                gas,
                gasPrice,
                nonce: await web3.eth.getTransactionCount(ownerAddress, 'latest'),
            },
            privateKey
        );

        // Send signed transaction
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        res.send(stringifyBigInt({ success: true, receipt }));
    } catch (error) {
        console.error("Error setting value:", error);
        res.status(500).send(stringifyBigInt({ success: false, error: error.message }));
    }
});

app.post("/presale1-purchase-tokens", async (req, res) => {
    const { userAddress, tokenAmount } = req.body; // Expecting userAddress and tokenAmount in the request body
    // Testing userAddress = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8

    if (!userAddress || !tokenAmount) {
        return res.status(400).send({ success: false, error: "Both userAddress and tokenAmount are required" });
    }

    try {
        // Interact with the smart contract
        const receipt = await icoContract.methods
            .presale1(tokenAmount) // Call the contract function
            .send({ from: userAddress }); // Use the user's address to send the transaction

        res.send(stringifyBigInt({ success: true, receipt }));
    } catch (error) {
        console.error("Error executing purchaseTokens function:", error);
        res.status(500).send(stringifyBigInt({ success: false, error: error.message }));
    }
});

app.post("/set-presale2-time", async (req, res) => {
    const { value } = req.body; // Expecting value from the request body
    
    const ownerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Replace with your owner address
    const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

    if (value === undefined) {
        return res.status(400).send({ success: false, error: "Value is required" });
    }

    try {
    
        const tx = icoContract.methods.setPresale2Time(value);
        const gas = await tx.estimateGas({ from: ownerAddress });
        const gasPrice = await web3.eth.getGasPrice();
        const signedTx = await web3.eth.accounts.signTransaction(
            {
                to: icoAddress,
                data: tx.encodeABI(),
                gas,
                gasPrice,
                nonce: await web3.eth.getTransactionCount(ownerAddress, 'latest'),
            },
            privateKey
        );

        // Send signed transaction
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        res.send(stringifyBigInt({ success: true, receipt }));
    } catch (error) {
        console.error("Error setting value:", error);
        res.status(500).send(stringifyBigInt({ success: false, error: error.message }));
    }
});

app.post("/presale2-purchase-tokens", async (req, res) => {
    const { userAddress, tokenAmount } = req.body; // Expecting userAddress and tokenAmount in the request body
    // Testing userAddress = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8

    if (!userAddress || !tokenAmount) {
        return res.status(400).send({ success: false, error: "Both userAddress and tokenAmount are required" });
    }

    try {
        // Interact with the smart contract
        const receipt = await icoContract.methods
            .presale2(tokenAmount) // Call the contract function
            .send({ from: userAddress }); // Use the user's address to send the transaction

        res.send(stringifyBigInt({ success: true, receipt }));
    } catch (error) {
        console.error("Error executing purchaseTokens function:", error);
        res.status(500).send(stringifyBigInt({ success: false, error: error.message }));
    }
});

app.post("/endstatus", async (req, res) => {
    
    const ownerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Replace with your owner address
    const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

    try {
    
        const tx = icoContract.methods.endIcoStatus();
        const gas = await tx.estimateGas({ from: ownerAddress });
        const gasPrice = await web3.eth.getGasPrice();
        const signedTx = await web3.eth.accounts.signTransaction(
            {
                to: icoAddress,
                data: tx.encodeABI(),
                gas,
                gasPrice,
                nonce: await web3.eth.getTransactionCount(ownerAddress, 'latest'),
            },
            privateKey
        );

        // Send signed transaction
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        res.send(stringifyBigInt({ success: true, receipt }));
    } catch (error) {
        console.error("Error setting value:", error);
        res.status(500).send(stringifyBigInt({ success: false, error: error.message }));
    }
});

app.post("/withdraw-usdt", async (req, res) => {
    const { value } = req.body; // Expecting value from the request body
    
    const ownerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Replace with your owner address
    const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

    if (value === undefined) {
        return res.status(400).send({ success: false, error: "Address is required" });
    }

    try {
    
        const tx = icoContract.methods.withdrawUSDT(value);
        const gas = await tx.estimateGas({ from: ownerAddress });
        const gasPrice = await web3.eth.getGasPrice();
        const signedTx = await web3.eth.accounts.signTransaction(
            {
                to: icoAddress,
                data: tx.encodeABI(),
                gas,
                gasPrice,
                nonce: await web3.eth.getTransactionCount(ownerAddress, 'latest'),
            },
            privateKey
        );

        // Send signed transaction
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        res.send(stringifyBigInt({ success: true, receipt }));
    } catch (error) {
        console.error("Error setting value:", error);
        res.status(500).send(stringifyBigInt({ success: false, error: error.message }));
    }
});


const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});