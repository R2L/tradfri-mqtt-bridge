FROM arm32v7/node:10-slim

COPY package*.json ./

RUN npm install

COPY . .

CMD [ "npm", "start" ]