const { ethers } = require("ethers");
const solc = require("solc");
const fs = require("fs");
require("dotenv").config();

async function main() {
  // 1. Kết nối RPC Node và Wallet
  const rpcUrl = process.env.RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey || !rpcUrl) {
    throw new Error("Vui lòng cấu hình PRIVATE_KEY và RPC_URL trong file .env");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`Đang sử dụng ví deploy: ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`Số dư hiện tại: ${ethers.formatEther(balance)} ETH/Token`);

  // 2. Biên dịch Contract Solidity
  console.log("\nĐang biên dịch Smart Contract...");
  const sourceCode = fs.readFileSync("./SimpleStorage.sol", "utf8");

  const input = {
    language: "Solidity",
    sources: {
      "SimpleStorage.sol": {
        content: sourceCode,
      },
    },
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  
  if (output.errors) {
    output.errors.forEach((err) => {
      if (err.severity === "error") {
        throw new Error(`Lỗi biên dịch: ${err.formattedMessage}`);
      }
    });
  }

  const contractFile = output.contracts["SimpleStorage.sol"]["SimpleStorage"];
  const abi = contractFile.abi;
  const bytecode = contractFile.evm.bytecode.object;

  // 3. Khởi tạo Contract Factory và Deploy
  console.log("Đang gửi giao dịch deploy lên mạng QMS Testnet...");
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  
  // Gửi giao dịch triển khai
  const contract = await factory.deploy();
  console.log(`Transaction Hash: ${contract.deploymentTransaction().hash}`);
  
  // Chờ giao dịch xác nhận thành công
  await contract.waitForDeployment();
  const deployedAddress = await contract.getAddress();

  console.log(`\n Triển khai thành công!`);
  console.log(`Địa chỉ Smart Contract: ${deployedAddress}`);
}

main().catch((error) => {
  console.error("Lỗi trong quá trình deploy:", error);
  process.exitCode = 1;
});