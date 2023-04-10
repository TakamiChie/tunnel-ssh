const { setTimeout } = require("timers/promises");

/**
 * Objects that manage and process tunnel connection information
 */
class TunnelObject{
  #server;
  #client;
  #tunnelOptions;
  #connecting;
  #connectionCloseEventListeners;
  /**
   * Error messages that need to be reconnected
   */
  RECONNECT_MESSAGES = ["No response from server", "Unable to exec", "Not connected"];
  /**
   * 
   * @param {net.Server} serverSocket Server object.
   * @param {ssh2.Client} clientSocket Client object.
   * @param {obhect} Objects indicating tunnel options
   *  * {boolean} autoClose Whether the server will end the connection when cutting the client. If `autoReconnect` is True, this option is ignored.
   *  * {boolean} autoReconnect `close()` When the connection is disconnected before calling, whether to retry the connection as an unexpected cutting.
   *  * {number} autoReconnectCount In the case of `autoReconnect = true`, the number of times to try reconnection. Exceptions occur when this number is exceeded.
   */
  constructor(serverSocket, clientSocket, tunnelOptions){
    this.#server = serverSocket;
    this.#client = clientSocket;
    this.#tunnelOptions = tunnelOptions;
    this.#connecting = false;
    this.#connectionCloseEventListeners = new Set();
    this.addConnectionCloseEventListener(this.#onConnectionClose());
  }

  /**
   * Get the server of the server of the connected.
   */
  get server() { return this.#server; }
  /**
   * Get the client connection object being connected.
   */
  get client() { return this.#client; }
  
  /**
   * Add an event handler called at the time of connection close.
   * @param {EventListener} listener Event listener that processes the connection end event
   */
  addConnectionCloseEventListener(listener)
  {
    this.#connectionCloseEventListeners.add(listener);
  }

  /**
   * Remove an event handler called at the time of connection close.
   * @param {EventListener} listener Event listener that processes the connection end event
   */
  removeConnectionCloseEventListener(listener)
  {
    this.#connectionCloseEventListeners.delete(listener);
  }

  /**
   * Event handler called when the connection is disconnected.
   */
  #onConnectionClose()
  {
    if(this.#tunnelOptions.autoClose)
    {
      server.getConnections((error, count) => {
        if (count === 0) {
          server.close();
        }
      });
    }
  }

  /**
   * Start transfer processing.
   * @param {ForwardOptions} forwardOptions Transfer options
   * @param {ssh2.Client} connection SSH Connection
   */
  async forwardOut(forwardOptions, connection){
    connection.on('close', () => { for(let l of this.#connectionCloseEventListeners){ l(this); } });
    this.#connecting = true;
    try {
      this.client.forwardOut(
        forwardOptions.srcAddr,
        forwardOptions.srcPort,
        forwardOptions.dstAddr,
        forwardOptions.dstPort, (err, stream) => {
            connection.pipe(stream).pipe(connection);
        });
    } catch (error) {
      if(this.#connecting && this.#reconnect && this.RECONNECT_MESSAGES.includes(error.message)){
        this.server.close();
        this.client.end();
        await setTimeout(100);
        this.forwardOut(forwardOptions, connection);
      }
    }
  }

  /**
   * Close the connection.
   */
  close(){
    this.#connecting = false;
    this.#server.close();
    this.#client.end();
  }
}

module.exports = { TunnelObject }