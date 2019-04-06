try:
    import eventlet
    eventlet.monkey_patch()
    print('Using eventlet')
    create_thread_func = lambda f: f
    start_thread_func = lambda f: eventlet.spawn(f)
except ImportError:
    try:
        import gevent
        import gevent.monkey
        gevent.monkey.patch_all()
        print('Using gevent')
        create_thread_func = lambda f: gevent.Greenlet(f)
        start_thread_func = lambda t: t.start()
    except ImportError:
        import threading
        print('Using threading')
        create_thread_func = lambda f: threading.Thread(target=f)
        start_thread_func = lambda t: t.start()

# The webserver module
from flask import Flask, render_template, redirect, url_for, session, request, url_for, jsonify
from flask_socketio import SocketIO, emit

# OpenCV and other Face Recogition modules
import cv2
import imutils
import face_recognition
from pickle import loads

# Other support modules
import os
import zipfile
from base64 import b64encode
from configparser import ConfigParser
from werkzeug.utils import secure_filename

# Custom modules
from modules.base64_2_image import data_uri_to_cv2_img

# Parsing config
config = ConfigParser()
config.read('config.ini')

args={}
args["dataset"]=config.get('arg', 'dataset')
args["encodings"]=config.get('arg', 'encodings')
args["detection-method"]=config.get('arg', 'detection-method')

# Loading data
data = loads(open(args["encodings"], "rb").read())

# Basic app setup
app = Flask(__name__, static_url_path='', static_folder='web/static', template_folder='web/templates')
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, ping_interval=2000, ping_timeout=120000, async_mode='eventlet')

# Initializing config for file uploader
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'dataset')
ALLOWED_EXTENSIONS = set(['zip'])

def allowed_file(filename):
    return '.' in filename and \
        filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Defining routes

# The index route - to server up the index.html page
@app.route('/')
def index():
    return render_template('index.html')


# The upload route - to serve up the uploader.html page
@app.route('/upload')
def upload():
    return render_template('uploader.html')


# The train route - to train the system for identifying the faces
@app.route('/train')
def train():
    # grab the paths to the input images in our dataset
    imagePaths = list(paths.list_images(args['dataset']))

    # initialize the list of known encodings and known names
    knownEncodings = []
    knownNames = []

    # loop over the image paths
    for (i, imagePath) in enumerate(imagePaths):
        # extract the person name from the image path
        name = imagePath.split(os.path.sep)[-2]

        # load the input image and convert it from RGB (OpenCV ordering) to dlib ordering (RGB)
        image = cv2.imread(imagePath)
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # detect the (x, y)-coordinates of the bounding boxes corresponding to each face in the input image
        boxes = face_recognition.face_locations(rgb, model=args["detection-method"])

        # compute the facial embedding for the face
        encodings = face_recognition.face_encodings(rgb, boxes)

        # loop over the encodings
        for encoding in encodings:
            # add each encoding + name to our set of known names and encodings
            knownEncodings.append(encoding)
            knownNames.append(name)

    data = { "encodings": knownEncodings, "names": knownNames }
    
    encodingsFile = open(args["encodings"], "wb")
    encodingsFile.write(pickle.dumps(data))
    encodingsFile.close()


# The file uploader route - to upload the files
@app.route('/upload-file', methods=['GET', 'POST'])
def upload_file():
    if request.method == 'POST':
        # check if the post request has the file part
        if 'uploads[]' not in request.files:
            return jsonify(status="ERROR", message="No file in request.files")
        
        file = request.files['uploads[]']
        
        # if user does not select file, browser also
        # submit a empty part without filename
        if file.filename == '':
            return jsonify(status="ERROR", message="No file selected")
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file.save(os.path.join(UPLOAD_FOLDER, filename))
            zip_ref = zipfile.ZipFile(os.path.join(UPLOAD_FOLDER, filename), 'r')
            zip_ref.extractall(UPLOAD_FOLDER)
            zip_ref.close()
            return jsonify(status="SUCCESS")
    
    return jsonify(status="ERROR", message="Post method not used")


# The connection event
@socketio.on('connect')
def onconnect():
    print('Got a connection')

# The disconnection event
@socketio.on('disconnect')
def ondisconnect():
    print('Client disconnected')
    cv2.destroyAllWindows()

# The streaming event
@socketio.on('stream')
def onimage(img):
    frame = data_uri_to_cv2_img(img)
    try:
        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        
        # Convert the image from BGR color (which OpenCV uses) to RGB color (which face_recognition uses)
        rgb_small_frame = small_frame[:, :, ::-1]
        face_names = []

        # Find all the faces and face encodings in the current frame of video
        boxes = face_recognition.face_locations(rgb_small_frame, model=args["detection-method"])
        encodings = face_recognition.face_encodings(rgb_small_frame, boxes)

        # loop over the facial embeddings
        for encoding in encodings:
            # attempt to match each face in the input image to our known encodings
            matches = face_recognition.compare_faces(data["encodings"], encoding)
            name = "Unknown"

            # check to see if we have found a match
            if True in matches:
                first_match_index = matches.index(True)
                name = data['names'][first_match_index]

            # update the list of names
            face_names.append(name)

        # loop over the recognized faces
        for (top, right, bottom, left), name in zip(boxes, face_names):
            # Scale back up face locations since the frame we detected in was scaled to 1/4 size
            top *= 4
            right *= 4
            bottom *= 4
            left *= 4
                
            # Draw a box around the face
            cv2.rectangle(frame, (left, top), (right, bottom), (0, 0, 255), 2)

            # Draw a label with a name below the face
            cv2.rectangle(frame, (left, bottom - 20), (right, bottom), (0, 0, 255), cv2.FILLED)
            
            font = cv2.FONT_HERSHEY_DUPLEX
            cv2.putText(frame, name, (left + 6, bottom - 6), font, 0.5, (255, 255, 255), 1, cv2.LINE_AA)
            
            emit('person_name', name)
            socketio.sleep(0)
    except:
        pass

    # Encoding and send data back to the client
    retval, buffer = cv2.imencode('.jpg', frame)
    # encoded_image = b64encode(buffer)

    emit('restreaming', buffer.tobytes())
    socketio.sleep(0)


# Starting the program
if __name__ == '__main__':
    socketio.run(app)