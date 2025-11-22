FROM node:20-alpine

# ✅ Install git and bash inside the container
RUN apk update && apk add --no-cache git bash

WORKDIR /usr/src/

COPY package*.json ./
RUN npm install

COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
