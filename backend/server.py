from autobahn.twisted.websocket import WebSocketServerFactory
from autobahn.twisted.websocket import WebSocketServerProtocol
import json
import sys
from twisted.python import log
from twisted.internet import reactor

from backend import model
from backend.solver import Solver


class Host(object):

    def __init__(self, protocol):
        self._protocol = protocol
        self._nodes = model.create_att532()
        self._solver = Solver(self._nodes)

    def handle_request_graph(self):
        msg = model.dump_nodes_json(self._nodes)
        self._protocol.sendMessage(msg)

    def handle_improve(self):
        result = self._solver.improve()
        msg = model.dump_improve_result_json(result)
        self._protocol.sendMessage(msg)


class TspServerProtocol(WebSocketServerProtocol):

    def onConnect(self, request):
        print('client connected: %s' % request.peer)
        self._host = Host(self)

    def onMessage(self, payload, isBinary):
        message = payload.decode('utf8')
        if message == 'requestGraph':
            self._host.handle_request_graph()
        elif message == 'improve':
            self._host.handle_improve()
        else:
            print('unknown message received')
            self.sendClose()

    def onClose(self, wasClean, code, reason):
        print('closed')


def run():
    log.startLogging(sys.stdout)

    factory = WebSocketServerFactory('ws://localhost:9002', debug=False)
    factory.protocol = TspServerProtocol

    reactor.listenTCP(9002, factory)
    reactor.run()
