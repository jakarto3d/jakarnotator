
FROM ubuntu:latest

RUN apt-get update && apt-get install -y --no-install-recommends \
    software-properties-common \
    build-essential \
    curl \
    git \
    python3 \
    python3-dev \
    python3-pip \
    python3-setuptools && \
    rm -rf /var/lib/apt/lists/*

RUN add-apt-repository ppa:ubuntugis/ppa

RUN curl -sL https://deb.nodesource.com/setup_9.x | bash

RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs \
    gdal-bin && \
    rm -rf /var/lib/apt/lists/*

RUN echo 'alias python=python3' >> ~/.bashrc


RUN pip3 install --upgrade pip

COPY requirements.txt requirements.txt
RUN pip3 install -r requirements.txt

RUN pip3 install cython
RUN git clone https://github.com/cocodataset/cocoapi
# Unable to install (makefile target install fails)
# python setup.py install fails. Here are the logs
# running build_ext
# building 'pycocotools._mask' extension
# creating build
# creating build/common
# creating build/temp.linux-x86_64-3.5
# creating build/temp.linux-x86_64-3.5/pycocotools
# x86_64-linux-gnu-gcc -pthread -DNDEBUG -g -fwrapv -O2 -Wall -Wstrict-prototypes -g -fstack-protector-strong -Wformat -Werror=format-security -Wdate-time -D_FORTIFY_SOURCE=2 -fPIC -I/usr/local/lib/python3.5/dist-packages/numpy/core/include -I../common -I/usr/include/python3.5m -c ../common/maskApi.c -o build/temp.linux-x86_64-3.5/../common/maskApi.o -Wno-cpp -Wno-unused-function -std=c99
# x86_64-linux-gnu-gcc -pthread -DNDEBUG -g -fwrapv -O2 -Wall -Wstrict-prototypes -g -fstack-protector-strong -Wformat -Werror=format-security -Wdate-time -D_FORTIFY_SOURCE=2 -fPIC -I/usr/local/lib/python3.5/dist-packages/numpy/core/include -I../common -I/usr/include/python3.5m -c pycocotools/_mask.c -o build/temp.linux-x86_64-3.5/pycocotools/_mask.o -Wno-cpp -Wno-unused-function -std=c99
# x86_64-linux-gnu-gcc: error: pycocotools/_mask.c: No such file or directory
# x86_64-linux-gnu-gcc: fatal error: no input files
# compilation terminated.
# error: command 'x86_64-linux-gnu-gcc' failed with exit status 1
# RUN mv cocoapi/PythonAPI/pycocotools /usr/local/lib/python3.5/dist-packages
RUN pip3 install "git+https://github.com/philferriere/cocoapi.git#egg=pycocotools&subdirectory=PythonAPI"

RUN git clone https://github.com/waspinator/pycococreator
RUN cd pycococreator && python3 setup.py install


WORKDIR /app
COPY jakarnotator/package*.json ./

RUN npm install

COPY jakarnotator .

EXPOSE 8080
CMD [ "npm", "start" ]
