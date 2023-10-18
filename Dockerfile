FROM node:16

WORKDIR /usr/src/app

COPY package*.json ./
COPY prisma ./prisma/
COPY .env ./.env

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3500

COPY start.sh start.sh

CMD ["./start.sh"]