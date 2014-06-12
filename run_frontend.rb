#!/usr/bin/env ruby

require 'webrick'

root = File.join(__dir__, 'frontend')
server = WEBrick::HTTPServer.new(:Port => 18000, :DocumentRoot => root)
trap("INT") { server.stop }
server.start
