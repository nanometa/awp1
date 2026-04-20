# Use official Python 3.11 slim image
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    jq \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Clone official repository
RUN git clone https://github.com/awp-worknet/mine-skill.git /app/mine-skill

# Install mine-skill dependencies
WORKDIR /app/mine-skill
RUN pip install --no-cache-dir -r requirements-core.txt

# Return to /app and copy Fernando's scripts
WORKDIR /app
COPY . .

# Patch hardcoded Windows paths in Fernando's scripts + Switch to Validator command
RUN sed -i 's|f:\\\\minework-farm\\\\wrapper.log|/app/wrapper.log|g' awp-wrapper.js && \
    sed -i 's|f:/minework-farm/wallets.json|/app/wallets.json|g' awp-wrapper.js && \
    sed -i "s|path.join(MINE_SKILL_DIR, '.venv', 'Scripts', 'python.exe')|'/usr/local/bin/python3'|g" start-farm.js && \
    sed -i "s|path.join(__dirname, 'awp-wrapper.cmd')|'node /app/awp-wrapper.js'|g" start-farm.js && \
    sed -i 's/agent-start\", DATASET/run-validator-worker\"/g' start-farm.js

# Install Node dependencies
RUN npm install ethers axios

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PATH="/usr/local/bin:$PATH"

# Run the farm starter (now launches validators)
CMD ["node", "start-farm.js"]
