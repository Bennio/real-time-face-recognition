# REAL TIME FACE RECOGNITION

## Overview

This is a project for recognizing faces in realtime in webcam. The application uses [`Python's Flask Server`](http://flask.pocoo.org/) as the application server and [`Flask-SocketIO`](https://flask-socketio.readthedocs.io/en/latest/) which gives Flask applications access to low latency bi-directional communications between the clients and the server.

## Setting up Environment

**1. Install Python 3.6.7**

Install python 3.6.7 on your system by executing the following commands

```console
foo@bar:~$ sudo apt update
foo@bar:~$ sudo apt install python3.6
```

**2. Setup Python Virtual Environment**

Run the follwing command to setup virtual environment in your system.

```console
foo@bar:~$ sudo pip3 install virtualenv virtualenvwrapper
```

Once you got everything right, execute the following to create a virtual environment

```console
foo@bar:~$ mkvirtualenv --python=/usr/bin/python3 cv
```

This creates a virtual environment named `cv` based on `python3` installed in your system. Now to use the virtual environment run the fowllowing command.

```console
foo@bar:~$ workon cv
```

This will update your terminal to work on the newly created virtual environment `cv`. Your terminal should look something like:

```console
(cv) foo@bar:~$ 
```

**3. Install dependencies**

Execute the following to install all the dependencies in the virtual environment you just setted up.

```console
(cv) foo@bar:~$ pip install -r requirements.txt
```

Once all the dependencies are installed, you are ready to rock.

## Running the Application

**1. Start Server**

From the virtual environment start server with command:

```console
(cv) foo@bar:~$ python app.py
```

This will start a server running on port `5000`. To check everything's working fine, check the output. It should be same as:

```console
(cv) foo@bar:~$ python app.py
using eventlet
```

**2. Run the application in Browser**

Once everythings fine, open `localhost:5000` on Chrome or any other browser.