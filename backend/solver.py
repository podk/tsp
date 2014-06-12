import math
import time

from model import Edge
from model import ImproveResult

class Solver(object):

    def __init__(self, nodes):
        self._nodes = nodes

    def improve(self):
        # FIXME: Implement
        return self._make_mock_result()

    def _distance(self, n, m):
        node_n = self._nodes[n]
        node_m = self._nodes[m]
        x = node_n.x - node_m.x
        y = node_n.y - node_m.y
        return math.sqrt(x*x + y*y)

    def _make_mock_result(self):
        num_nodes = len(self._nodes)
        edges = []
        length = 0
        for n in xrange(num_nodes - 1):
            edges.append(Edge(n, n + 1))
            length += self._distance(n, n + 1)
        # emulate delay
        time.sleep(1.0)
        return ImproveResult(edges=edges, length=length)
