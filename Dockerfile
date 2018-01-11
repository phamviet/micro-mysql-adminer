FROM node:8

ENV NODE_ENV production

RUN mkdir /app
WORKDIR /app

COPY package.json .
COPY package-lock.json .

RUN npm install --no-dev --no-progress

COPY index.js .

EXPOSE 3000

CMD ["npm", "start"]