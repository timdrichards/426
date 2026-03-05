FROM alpine:3.20
RUN apk add --no-cache curl jq
WORKDIR /runner
COPY run.sh /runner/run.sh
RUN chmod +x /runner/run.sh
ENTRYPOINT ["/runner/run.sh"]
CMD ["help"]
