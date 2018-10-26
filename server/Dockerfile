# This image serves resources out of s3 behind keymaster authentication.
FROM ubuntu:18.04
 RUN apt-get update -y && apt-get install -y \
  python3-pip \
  python3-dev
COPY ./requirements.txt /app/requirements.txt
WORKDIR /app
RUN pip3 install -r requirements.txt
COPY . /app
ENTRYPOINT [ "python3" ]
CMD [ "app.py" ]

# To run the container locally for debugging:
# ```
# docker build -t server .
# docker run -it \
#   -v "$HOME/.aws/:/root/.aws/" \
#   -p 443:443 \
#   -e "BUCKET=$BUCKET" \
#   -e "DATA_BUCKET=$DATA_BUCKET" \
#   -e "AWS_PROFILE=$AWS_PROFILE" \
#   -e "authorization_endpoint=$authorization_endpoint" \
#   -e "token_endpoint=$token_endpoint" \
#   -e "userinfo_endpoint=$userinfo_endpoint" \
#   -e "redirect_uri=$redirect_uri" \
#   -e "base_uri=$base_uri" \
#   -e "default_object=$default_object" \
#   -e "bucket_name=$bucket_name" \
#   server
# ```
