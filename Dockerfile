FROM node:12-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

COPY filebeat.yml ./

RUN npm install

RUN npm install -g typescript
RUN npm install -g ts-node

RUN apk add bash nano curl

RUN apk add filebeat --repository=http://dl-cdn.alpinelinux.org/alpine/edge/testing

# Bundle app source
COPY . .

RUN filebeat -c /usr/src/app/filebeat.yml &


CMD [ "ts-node", "controller.ts" ]