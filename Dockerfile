FROM node:9

WORKDIR /app

COPY jakarnotator/package.json ./package.json
RUN npm install

EXPOSE 8080

COPY jakarnotator .
CMD npm start
