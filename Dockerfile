
FROM ubuntu:latest

RUN apt-get update && apt-get install -y --no-install-recommends \
    software-properties-common \
    curl \
    python3 && \
    rm -rf /var/lib/apt/lists/*

RUN add-apt-repository ppa:ubuntugis/ppa

RUN curl -sL https://deb.nodesource.com/setup_9.x | bash

RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs \
    gdal-bin && \
    rm -rf /var/lib/apt/lists/*

RUN echo 'alias python=python3' >> ~/.bashrc

WORKDIR /app
COPY jakarnotator/package*.json ./

RUN npm install

COPY jakarnotator .

EXPOSE 8080
CMD [ "npm", "start" ]
