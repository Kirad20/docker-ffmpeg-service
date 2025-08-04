FROM jrottenberg/ffmpeg:ubuntu

MAINTAINER Paul Visco <paul.visco@gmail.com>

#####################################################################
#
# A Docker image to convert audio and video for web using web API
#
#   with
#     - Latest FFMPEG (built)
#     - NodeJS
#     - fluent-ffmpeg
#
#   For more on Fluent-FFMPEG, see 
#
#            https://github.com/fluent-ffmpeg/node-fluent-ffmpeg
#
#####################################################################

# Install Node.js and dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/local/src

# Custom Builds go here
RUN npm install -g fluent-ffmpeg

# Remove all tmpfile and cleanup
# =================================
WORKDIR /usr/local/
RUN rm -rf /usr/local/src

# =================================

# Setup a working directory to allow for
# docker run --rm -ti -v ${PWD}:/work ...
# =======================================
WORKDIR /work

# Make sure Node.js is installed
RUN           node -v
RUN           npm -v

#Create app dir
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Create uploads directory
RUN mkdir -p /usr/src/app/uploads
RUN chmod 777 /usr/src/app/uploads

#Install Dependencies
COPY package.json /usr/src/app
RUN npm install

#Bundle app source
COPY . /usr/src/app

EXPOSE 3000
ENTRYPOINT []
CMD [ "node", "app.js" ]