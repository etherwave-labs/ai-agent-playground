FROM oven/bun:1.1

WORKDIR /app

RUN apt-get update \
  && apt-get install -y git make curl g++ \
  && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y nodejs \
  && rm -rf /var/lib/apt/lists/*

RUN curl -LO https://github.com/Kitware/CMake/releases/download/v3.28.3/cmake-3.28.3-linux-x86_64.sh \
    && chmod +x cmake-3.28.3-linux-x86_64.sh \
    && ./cmake-3.28.3-linux-x86_64.sh --skip-license --prefix=/usr/local \
    && rm cmake-3.28.3-linux-x86_64.sh

COPY . .

RUN bun install

EXPOSE 3000

CMD ["bun", "run", "dev"]
