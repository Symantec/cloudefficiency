FROM ubuntu:18.04
RUN apt-get update && apt-get install -y \
  gettext-base \
  nodejs \
  npm \
  python3 \
  python3-pip

RUN mkdir /app
COPY ./report/requirements.txt /app/report/requirements.txt
COPY ./frontend/package.json /app/frontend/package.json
COPY ./frontend/package-lock.json /app/frontend/package-lock.json
COPY LICENSE /app/
WORKDIR /app/report
RUN pip3 install -r requirements.txt
WORKDIR /app/frontend
RUN npm install
WORKDIR /app
COPY ./report /app/report
COPY ./frontend /app/frontend
COPY ./upload.sh /app/
