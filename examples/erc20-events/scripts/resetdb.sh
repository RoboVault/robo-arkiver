#!/bin/bash
docker stop mongo
docker rm mongo
docker run --name mongo -d -p 27017:27017 mongodb/mongodb-community-server:latest