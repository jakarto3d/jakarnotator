FROM node:9

WORKDIR /app

COPY jakarnotator .

EXPOSE 8080
RUN npm install
CMD npm start
