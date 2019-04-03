import cv2
import pickle
import socket
import struct

HOST = ''
PORT = 8080

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
print('Socket created')

s.bind((HOST, PORT))
print('Socket bind complete')
s.listen(10)
print('Socket now listening')

conn, addr = s.accept()

data = ""
payload_size = struct.calcsize("L")

# Create file if its not there
fourcc = cv2.VideoWriter_fourcc(*"MJPG")
writer = cv2.VideoWriter("output.avi", fourcc, 25, (640, 480), True)

while True:
    # Retrieve message size
    while len(data) < payload_size:
        data += conn.recv(4096)
        print(data);

    packed_msg_size = data[:payload_size]
    data = data[payload_size:]
    msg_size = struct.unpack("L", packed_msg_size)[0]

    # Retrieve all data based on message size
    while len(data) < msg_size:
        data += conn.recv(4096)

    frame_data = data[:msg_size]
    data = data[msg_size:]

    # Extract frame
    frame = pickle.loads(frame_data)
    
    # Write to file
    if writer is not None:
        writer.write(frame)

    cv2.imshow('frame',frame)

    key = cv2.waitKey(10)
    if (key == 27) or (key == 113):
        break

cv2.destroyAllWindows()
