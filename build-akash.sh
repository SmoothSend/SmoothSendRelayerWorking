#!/bin/bash

# Build script for Akash deployment

echo "Building Docker image for Akash deployment..."

# Build the Docker image
docker build -t smoothsend-backend:latest .

echo "Docker image built successfully!"
echo "You can now deploy to Akash using the following commands:"
echo ""
echo "1. Create deployment:"
echo "   akash tx deployment create deploy.yaml --from <your-wallet> --gas auto --gas-adjustment 1.3"
echo ""
echo "2. Check deployment status:"
echo "   akash query deployment get --owner <your-address> --dseq <deployment-sequence>"
echo ""
echo "3. View bids:"
echo "   akash query market bid list --owner <your-address> --dseq <deployment-sequence>"
echo ""
echo "4. Create lease:"
echo "   akash tx market lease create --owner <your-address> --dseq <deployment-sequence> --gseq 1 --oseq 1 --provider <provider-address> --from <your-wallet>"
echo ""
echo "5. Get service status:"
echo "   akash provider service-status --owner <your-address> --dseq <deployment-sequence> --gseq 1 --oseq 1 --provider <provider-address>"
