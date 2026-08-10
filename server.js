const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

const clients = new Map();

wss.on('connection', (ws) => {
  let userRole = null;
  let userPairCode = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'register') {
        userRole = data.role;
        userPairCode = data.pairCode;

        if (!clients.has(userPairCode)) {
          clients.set(userPairCode, {});
        }
        
        const group = clients.get(userPairCode);
        group[userRole] = ws;

        console.log(`Registered ${userRole} for pairing code ${userPairCode}`);
        
        ws.send(JSON.stringify({
          type: 'registered',
          status: 'success',
          role: userRole
        }));
      } else if (data.type === 'offer' || data.type === 'answer' || data.type === 'candidate' || data.type === 'command') {
        if (!userPairCode) return;
        
        const group = clients.get(userPairCode);
        if (!group) return;

        const targetRole = (userRole === 'parent') ? 'child' : 'parent';
        const targetWs = group[targetRole];

        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          targetWs.send(JSON.stringify(data));
        }
      }
    } catch (e) {
      console.error('Error handling message:', e);
    }
  });

  ws.on('close', () => {
    if (userPairCode && clients.has(userPairCode)) {
      const group = clients.get(userPairCode);
      if (group && userRole) {
        delete group[userRole];
        if (!group.parent && !group.child) {
          clients.delete(userPairCode);
        }
      }
    }
  });
});

console.log(`Signaling Server running on port ${PORT}`);
