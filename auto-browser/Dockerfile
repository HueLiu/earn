FROM node:20

WORKDIR /app

ENV NPM_CONFIG_LOGLEVEL=warn
COPY ./package.json ./
RUN npm install --production
RUN npm install pm2 -g

RUN npx playwright install --with-deps chromium

COPY ./src ./src/
COPY ./pm2.json ./
COPY ./docker-entrypoint.sh ./
RUN mkdir data

RUN ls -al

ENTRYPOINT [ "bash" ]
CMD [ "docker-entrypoint.sh" ]
