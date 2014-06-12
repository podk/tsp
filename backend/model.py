import json
import os


def parent_dir(path, count=1):
    if count <= 0:
        return path
    return parent_dir(os.path.dirname(path), count - 1)


DATA_DIR = os.path.join(parent_dir(os.path.dirname(os.path.abspath(__file__))),
                        'data')


class Node(object):

    def __init__(self, index, x, y):
        self.index = index
        self.x = x
        self.y = y

    def __str__(self):
        return 'index=%d, x=%d, y=%d' % (self.index, self.x, self.y)


class Edge(object):

    def __init__(self, n, m):
        self.n = n
        self.m = m

    def __str__(self):
        return 'n=%d, m=%d' % (self.n, self.m)


class ImproveResult(object):

    def __init__(self, edges, length):
        self.edges = edges
        self.length = length


class NodeJSONEncoder(json.JSONEncoder):

    def default(self, node):
        return node.__dict__


class ImproveResultJSONEncoder(json.JSONEncoder):

    def default(self, result):
        return result.__dict__


def dump_nodes_json(nodes):
    return json.dumps(nodes, cls=NodeJSONEncoder)


def dump_improve_result_json(result):
    return json.dumps(result, cls=ImproveResultJSONEncoder)


def create_att532():
    nodes = []
    with open(os.path.join(DATA_DIR, 'att532.tsp')) as f:
        # Skip until seeing node section
        for line in f:
            if line.strip() == 'NODE_COORD_SECTION':
                break

        for line in f:
            if line.strip() == 'EOF':
                break
            index, x, y = map(lambda x: int(x), line.split())
            # |index| in att532.tsp is 1-based numbering
            nodes.append(Node(index - 1, x, y))

    return nodes
